const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const RoomMember = require("../models/RoomMember");
const RoomMessage = require("../models/RoomMessage");
const User = require("../models/User");

const roomPresence = new Map();

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
  }
};

const isMember = async (roomId, userId) => {
  const membership = await RoomMember.findOne({ roomId, userId }).select("_id").lean();
  return Boolean(membership);
};

const initializeRealtime = (httpServer, allowedOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigin,
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
      removePresence(currentRoomId, socket.data.userId);
      emitPresence(io, currentRoomId);
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

    socket.on("disconnect", () => {
      leaveCurrentRoom();
    });
  });

  return io;
};

module.exports = {
  initializeRealtime,
};