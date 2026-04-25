const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const RoomMember = require("../models/RoomMember");
const RoomMessage = require("../models/RoomMessage");
const User = require("../models/User");

const roomPresence = new Map();
const roomDrafts = new Map();
const roomCursors = new Map();

const getPresenceUserIds = (roomId) => {
  const roomMap = roomPresence.get(roomId);

  if (!roomMap) {
    return [];
  }

  return Array.from(roomMap.keys());
};

const getRecipientPresenceCount = (roomId, senderUserId) =>
  getPresenceUserIds(roomId).filter((userId) => userId !== String(senderUserId)).length;

const emitPresence = (io, roomId) => {
  io.to(roomId).emit("room:presence", {
    roomId,
    userIds: getPresenceUserIds(roomId),
  });
};

const addPresence = (roomId, userId) => {
  if (!roomPresence.has(roomId)) {
    roomPresence.set(roomId, new Map());
  }

  const roomMap = roomPresence.get(roomId);
  const nextCount = (roomMap.get(userId) || 0) + 1;
  roomMap.set(userId, nextCount);
};

const removePresence = (roomId, userId) => {
  const roomMap = roomPresence.get(roomId);

  if (!roomMap) {
    return;
  }

  const currentCount = roomMap.get(userId) || 0;

  if (currentCount <= 1) {
    roomMap.delete(userId);
  } else {
    roomMap.set(userId, currentCount - 1);
  }

  if (roomMap.size === 0) {
    roomPresence.delete(roomId);
    roomDrafts.delete(roomId);
    roomCursors.delete(roomId);
  }
};

const upsertCursor = (roomId, userId, payload) => {
  if (!roomCursors.has(roomId)) {
    roomCursors.set(roomId, new Map());
  }

  const roomMap = roomCursors.get(roomId);
  roomMap.set(userId, {
    userId,
    filePath: payload.filePath,
    lineNumber: payload.lineNumber,
    column: payload.column,
    userName: payload.userName,
    updatedAt: new Date().toISOString(),
  });
};

const removeCursor = (roomId, userId) => {
  const roomMap = roomCursors.get(roomId);

  if (!roomMap) {
    return false;
  }

  const existed = roomMap.delete(userId);

  if (roomMap.size === 0) {
    roomCursors.delete(roomId);
  }

  return existed;
};

const getCursorSnapshot = (roomId) => {
  const roomMap = roomCursors.get(roomId);

  if (!roomMap) {
    return [];
  }

  return Array.from(roomMap.values());
};

const upsertRoomDraftFile = (roomId, filePath, content, language) => {
  if (!roomDrafts.has(roomId)) {
    roomDrafts.set(roomId, new Map());
  }

  const draftMap = roomDrafts.get(roomId);
  draftMap.set(filePath, {
    path: filePath,
    content,
    language,
    updatedAt: new Date().toISOString(),
  });
};

const getRoomDraftSnapshot = (roomId) => {
  const draftMap = roomDrafts.get(roomId);

  if (!draftMap) {
    return [];
  }

  return Array.from(draftMap.values());
};

const isMember = async (roomId, userId) => {
  const membership = await RoomMember.findOne({ roomId, userId }).select("_id").lean();
  return Boolean(membership);
};

const initializeRealtime = (httpServer, isAllowedOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} is not allowed by Socket.IO CORS`));
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!rawToken) {
      return next(new Error("Not authorized"));
    }

    const token = String(rawToken).startsWith("Bearer ") ? String(rawToken).slice(7) : String(rawToken);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      return next();
    } catch (error) {
      return next(new Error("Not authorized"));
    }
  });

  io.on("connection", (socket) => {
    const leaveCurrentRoom = () => {
      const currentRoomId = socket.data.roomId;

      if (!currentRoomId) {
        return;
      }

      socket.leave(currentRoomId);
      const cursorRemoved = removeCursor(currentRoomId, String(socket.data.userId));
      removePresence(currentRoomId, socket.data.userId);
      emitPresence(io, currentRoomId);

      if (cursorRemoved) {
        io.to(currentRoomId).emit("code:cursor:remove", {
          roomId: currentRoomId,
          userId: String(socket.data.userId),
        });
      }

      socket.data.roomId = null;
    };

    socket.on("room:join", async (payload, ack) => {
      try {
        const roomId = typeof payload?.roomId === "string" ? payload.roomId.trim() : "";

        if (!roomId) {
          if (typeof ack === "function") {
            ack({ ok: false, message: "roomId is required" });
          }
          return;
        }

        const allowed = await isMember(roomId, socket.data.userId);

        if (!allowed) {
          if (typeof ack === "function") {
            ack({ ok: false, message: "Access denied to this room" });
          }
          return;
        }

        leaveCurrentRoom();

        socket.join(roomId);
        socket.data.roomId = roomId;
        addPresence(roomId, socket.data.userId);
        emitPresence(io, roomId);
        socket.emit("code:snapshot", {
          roomId,
          files: getRoomDraftSnapshot(roomId),
        });
        socket.emit("code:cursor:snapshot", {
          roomId,
          cursors: getCursorSnapshot(roomId),
        });

        if (typeof ack === "function") {
          ack({ ok: true });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Failed to join room" });
        }
      }
    });

    socket.on("chat:send", async (payload, ack) => {
      try {
        const roomId = typeof payload?.roomId === "string" ? payload.roomId.trim() : socket.data.roomId;
        const text = typeof payload?.text === "string" ? payload.text.trim() : "";

        if (!roomId) {
          if (typeof ack === "function") {
            ack({ ok: false, message: "roomId is required" });
          }
          return;
        }

        if (!text) {
          if (typeof ack === "function") {
            ack({ ok: false, message: "Message text is required" });
          }
          return;
        }

        if (text.length > 2000) {
          if (typeof ack === "function") {
            ack({ ok: false, message: "Message is too long" });
          }
          return;
        }

        const allowed = await isMember(roomId, socket.data.userId);

        if (!allowed) {
          if (typeof ack === "function") {
            ack({ ok: false, message: "Access denied to this room" });
          }
          return;
        }

        const created = await RoomMessage.create({
          roomId,
          userId: socket.data.userId,
          text,
        });

        const sender = await User.findById(socket.data.userId).select("name").lean();

        const message = {
          id: created._id.toString(),
          roomId: created.roomId.toString(),
          userId: created.userId.toString(),
          senderName: sender?.name || "Unknown",
          text: created.text,
          createdAt: created.createdAt,
        };

        io.to(roomId).emit("chat:new", message);

        if (typeof ack === "function") {
          const recipientsOnline = getRecipientPresenceCount(roomId, socket.data.userId);
          ack({
            ok: true,
            message,
            recipientsOnline,
            deliveryStatus: recipientsOnline > 0 ? "delivered" : "sent",
          });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Failed to send message" });
        }
      }
    });

    socket.on("code:update", async (payload) => {
      try {
        const roomId = typeof payload?.roomId === "string" ? payload.roomId.trim() : socket.data.roomId;
        const filePath = typeof payload?.filePath === "string" ? payload.filePath.trim() : "";
        const content = typeof payload?.content === "string" ? payload.content : "";
        const language = typeof payload?.language === "string" ? payload.language.trim() : "";

        if (!roomId || !filePath) {
          return;
        }

        const allowed = await isMember(roomId, socket.data.userId);

        if (!allowed) {
          return;
        }

        upsertRoomDraftFile(roomId, filePath, content, language);

        socket.to(roomId).emit("code:update", {
          roomId,
          filePath,
          content,
          language,
          userId: socket.data.userId,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Best-effort realtime sync event.
      }
    });

    socket.on("code:cursor", async (payload) => {
      try {
        const roomId = typeof payload?.roomId === "string" ? payload.roomId.trim() : socket.data.roomId;
        const filePath = typeof payload?.filePath === "string" ? payload.filePath.trim() : "";
        const lineNumber = Number.isInteger(payload?.lineNumber) ? payload.lineNumber : 1;
        const column = Number.isInteger(payload?.column) ? payload.column : 1;
        const rawUserName = typeof payload?.userName === "string" ? payload.userName.trim() : "";
        const fallbackName = String(socket.data.email || "User").split("@")[0] || "User";

        if (!roomId || !filePath) {
          return;
        }

        const allowed = await isMember(roomId, socket.data.userId);

        if (!allowed) {
          return;
        }

        const safeLineNumber = Math.max(1, lineNumber);
        const safeColumn = Math.max(1, column);
        const safeUserName = rawUserName || fallbackName;
        const userId = String(socket.data.userId);

        upsertCursor(roomId, userId, {
          filePath,
          lineNumber: safeLineNumber,
          column: safeColumn,
          userName: safeUserName,
        });

        socket.to(roomId).emit("code:cursor", {
          roomId,
          userId,
          filePath,
          lineNumber: safeLineNumber,
          column: safeColumn,
          userName: safeUserName,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Best-effort cursor sync event.
      }
    });

    socket.on("disconnect", () => {
      leaveCurrentRoom();
    });
  });

  return io;
};

module.exports = {
  initializeRealtime,
};
