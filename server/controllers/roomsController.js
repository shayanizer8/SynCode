const crypto = require("crypto");

const Room = require("../models/Room");
const RoomMember = require("../models/RoomMember");
const RoomFile = require("../models/RoomFile");
const RoomMessage = require("../models/RoomMessage");
const User = require("../models/User");
const RoomInvitation = require("../models/RoomInvitation");

const normalizeEmailList = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .flatMap((item) => String(item || "").split(/[,\s;]+/g))
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean)
      )
    );
  }

  if (typeof value === "string") {
    return Array.from(
      new Set(
        value
          .split(/[,\s;]+/g)
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean)
      )
    );
  }

  return [];
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const requireAuth = (req, res) => {
  if (!req.user || !req.user.userId) {
    res.status(401).json({ message: "Not authorized" });
    return false;
  }
  return true;
};

const ensureRoomMember = async (roomId, userId) => {
  const membership = await RoomMember.findOne({ roomId, userId }).select("_id role").lean();
  return membership;
};

const toRoomSummary = async (room, currentUserId) => {
  const owner = await User.findById(room.ownerId).select("name").lean();
  const members = await RoomMember.find({ roomId: room._id }).select("userId").lean();
  const memberUserIds = members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: memberUserIds } }).select("name").lean();
  const initials = users
    .map((u) => (u?.name ? String(u.name).trim().slice(0, 1).toUpperCase() : "U"))
    .slice(0, 5);

  return {
    _id: room._id,
    id: room._id.toString(),
    ownerId: room.ownerId.toString(),
    ownerName: owner?.name || "Unknown",
    name: room.name,
    language: room.language,
    isPrivate: room.isPrivate,
    inviteCode: room.inviteCode,
    collaborators: initials,
    updatedAt: room.updatedAt,
    createdAt: room.createdAt,
    live: false,
    isOwner: String(room.ownerId) === String(currentUserId),
  };
};

const generateInviteCode = () => crypto.randomBytes(4).toString("hex").toUpperCase();

const getUserRooms = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const memberships = await RoomMember.find({ userId: req.user.userId }).select("roomId").lean();
    const roomIds = memberships.map((m) => m.roomId);

    const rooms = await Room.find({ _id: { $in: roomIds } }).sort({ updatedAt: -1 }).lean();
    const mapped = await Promise.all(rooms.map((room) => toRoomSummary(room, req.user.userId)));

    return res.status(200).json({ rooms: mapped });
  } catch (error) {
    console.error("Get rooms error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const getRecentRooms = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const memberships = await RoomMember.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .limit(6)
      .select("roomId")
      .lean();
    const roomIds = memberships.map((m) => m.roomId);

    const rooms = await Room.find({ _id: { $in: roomIds } }).select("name language").lean();
    return res.status(200).json({ rooms });
  } catch (error) {
    console.error("Get recent rooms error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const createRoom = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { name, language = "Python", isPrivate = true } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Room name is required" });
    }

    const ownerId = req.user.userId;

    let inviteCode = generateInviteCode();
    for (let attempts = 0; attempts < 5; attempts += 1) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await Room.findOne({ inviteCode }).select("_id").lean();
      if (!exists) break;
      inviteCode = generateInviteCode();
    }

    const room = await Room.create({
      ownerId,
      name: name.trim(),
      language,
      isPrivate: Boolean(isPrivate),
      inviteCode,
    });

    await RoomMember.create({
      roomId: room._id,
      userId: ownerId,
      role: "owner",
    });

    const rawInviteEmails = req.body?.inviteEmails ?? req.body?.inviteEmail;
    const inviteEmails = normalizeEmailList(rawInviteEmails).filter(isValidEmail);

    if (inviteEmails.length > 0) {
      const existingUsers = await User.find({ email: { $in: inviteEmails } }).select("_id email").lean();
      const userIdByEmail = new Map(existingUsers.map((u) => [String(u.email).toLowerCase(), u._id]));

      const invitationsToInsert = inviteEmails.map((email) => ({
        roomId: room._id,
        inviterId: ownerId,
        inviteeEmail: email,
        inviteeUserId: userIdByEmail.get(email) || null,
        status: "pending",
      }));

      await RoomInvitation.insertMany(invitationsToInsert, { ordered: false }).catch(() => {
        // Best-effort: ignore duplicates/races.
      });
    }

    return res.status(201).json({ room });
  } catch (error) {
    console.error("Create room error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const renameRoom = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { roomId } = req.params;
    const { name } = req.body || {};

    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Room name is required" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (String(room.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Only the room owner can rename this room" });
    }

    room.name = name.trim();
    await room.save();

    return res.status(200).json({ room });
  } catch (error) {
    console.error("Rename room error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteRoom = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (String(room.ownerId) !== String(req.user.userId)) {
      return res.status(403).json({ message: "Only the room owner can delete this room" });
    }

    await Promise.all([
      RoomFile.deleteMany({ roomId }),
      RoomMessage.deleteMany({ roomId }),
      RoomMember.deleteMany({ roomId }),
      RoomInvitation.deleteMany({ roomId }),
      Room.deleteOne({ _id: roomId }),
    ]);

    return res.status(200).json({ message: "Room deleted" });
  } catch (error) {
    console.error("Delete room error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const getRoomMetadata = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const membership = await ensureRoomMember(roomId, req.user.userId);
    if (!membership) {
      return res.status(403).json({ message: "Access denied to this room" });
    }

    const room = await Room.findById(roomId).lean();
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error("Get room metadata error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const getRoomContent = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const membership = await ensureRoomMember(roomId, req.user.userId);
    if (!membership) {
      return res.status(403).json({ message: "Access denied to this room" });
    }

    const files = await RoomFile.find({ roomId }).select("path language content").sort({ path: 1 }).lean();
    return res.status(200).json({ files });
  } catch (error) {
    console.error("Get room content error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateRoomContent = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { roomId } = req.params;
    const files = Array.isArray(req.body?.files) ? req.body.files : null;

    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    if (!files) {
      return res.status(400).json({ message: "files is required" });
    }

    const membership = await ensureRoomMember(roomId, req.user.userId);
    if (!membership) {
      return res.status(403).json({ message: "Access denied to this room" });
    }

    const normalized = files
      .map((file) => ({
        path: typeof file?.path === "string" ? file.path.trim() : "",
        language: typeof file?.language === "string" ? file.language.trim() : "",
        content: typeof file?.content === "string" ? file.content : "",
      }))
      .filter((file) => Boolean(file.path));

    await RoomFile.deleteMany({ roomId });
    if (normalized.length > 0) {
      await RoomFile.insertMany(
        normalized.map((file) => ({
          roomId,
          path: file.path,
          language: file.language,
          content: file.content,
        }))
      );
    }

    await Room.updateOne({ _id: roomId }, { $set: { updatedAt: new Date() } });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Update room content error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const joinRoomByInvite = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const inviteCodeOrLink = typeof req.body?.inviteCodeOrLink === "string" ? req.body.inviteCodeOrLink.trim() : "";
    if (!inviteCodeOrLink) {
      return res.status(400).json({ message: "Invite code or link is required" });
    }

    const codeMatch = inviteCodeOrLink.toUpperCase().match(/[A-F0-9]{8}/);
    const inviteCode = codeMatch ? codeMatch[0] : inviteCodeOrLink.toUpperCase();

    const room = await Room.findOne({ inviteCode }).lean();
    if (!room) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    const userId = req.user.userId;
    const existing = await RoomMember.findOne({ roomId: room._id, userId }).select("_id").lean();
    if (!existing) {
      await RoomMember.create({ roomId: room._id, userId, role: "editor" });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error("Join room by invite error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const joinRoomById = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const room = await Room.findById(roomId).lean();
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const userId = req.user.userId;
    const existing = await RoomMember.findOne({ roomId, userId }).select("_id").lean();
    if (!existing) {
      return res.status(403).json({ message: "Access denied to this room" });
    }

    return res.status(200).json({ room });
  } catch (error) {
    console.error("Join room by id error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const getRoomMembers = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const membership = await ensureRoomMember(roomId, req.user.userId);
    if (!membership) {
      return res.status(403).json({ message: "Access denied to this room" });
    }

    const members = await RoomMember.find({ roomId }).select("userId role").lean();
    const userIds = members.map((m) => m.userId);
    const users = await User.find({ _id: { $in: userIds } }).select("name").lean();
    const nameById = new Map(users.map((u) => [u._id.toString(), u.name]));

    return res.status(200).json({
      members: members.map((m) => ({
        userId: m.userId.toString(),
        role: m.role,
        name: nameById.get(m.userId.toString()) || "Unknown",
      })),
    });
  } catch (error) {
    console.error("Get room members error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const getRoomMessages = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { roomId } = req.params;
    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    const membership = await ensureRoomMember(roomId, req.user.userId);
    if (!membership) {
      return res.status(403).json({ message: "Access denied to this room" });
    }

    const messages = await RoomMessage.find({ roomId }).sort({ createdAt: 1 }).limit(200).lean();
    const userIds = Array.from(new Set(messages.map((m) => m.userId.toString())));
    const users = await User.find({ _id: { $in: userIds } }).select("name").lean();
    const nameById = new Map(users.map((u) => [u._id.toString(), u.name]));

    return res.status(200).json({
      messages: messages.map((message) => ({
        id: message._id.toString(),
        userId: message.userId.toString(),
        senderName: nameById.get(message.userId.toString()) || "Unknown",
        text: message.text,
        createdAt: message.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get room messages error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const sendRoomMessage = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { roomId } = req.params;
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";

    if (!roomId) {
      return res.status(400).json({ message: "roomId is required" });
    }

    if (!text) {
      return res.status(400).json({ message: "text is required" });
    }

    if (text.length > 2000) {
      return res.status(400).json({ message: "Message is too long" });
    }

    const membership = await ensureRoomMember(roomId, req.user.userId);
    if (!membership) {
      return res.status(403).json({ message: "Access denied to this room" });
    }

    const created = await RoomMessage.create({
      roomId,
      userId: req.user.userId,
      text,
    });

    const sender = await User.findById(req.user.userId).select("name").lean();

    return res.status(201).json({
      message: {
        id: created._id.toString(),
        userId: created.userId.toString(),
        senderName: sender?.name || "Unknown",
        text: created.text,
        createdAt: created.createdAt,
      },
    });
  } catch (error) {
    console.error("Send room message error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createRoom,
  renameRoom,
  deleteRoom,
  getUserRooms,
  getRecentRooms,
  getRoomMetadata,
  getRoomContent,
  updateRoomContent,
  joinRoomByInvite,
  joinRoomById,
  getRoomMembers,
  getRoomMessages,
  sendRoomMessage,
};

