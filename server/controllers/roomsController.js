const Room = require("../models/Room");
const RoomFile = require("../models/RoomFile");
const RoomMember = require("../models/RoomMember");

const ALLOWED_LANGUAGES = ["Python", "JavaScript", "C++", "Java"];

const starterFileMap = {
  Python: {
    path: "main.py",
    content: "print('Welcome to SynCode')\n",
  },
  JavaScript: {
    path: "main.js",
    content: "console.log('Welcome to SynCode');\n",
  },
  "C++": {
    path: "main.cpp",
    content:
      "#include <iostream>\n\nint main() {\n    std::cout << \"Welcome to SynCode\" << std::endl;\n    return 0;\n}\n",
  },
  Java: {
    path: "Main.java",
    content:
      "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Welcome to SynCode\");\n    }\n}\n",
  },
};

const getInviteCodeFromInput = (inputValue) => {
  if (!inputValue || typeof inputValue !== "string") {
    return "";
  }

  const raw = inputValue.trim();

  try {
    const parsed = new URL(raw);
    const fromQuery = parsed.searchParams.get("invite");

    if (fromQuery) {
      return fromQuery.trim().toUpperCase();
    }

    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    return (lastSegment || "").trim().toUpperCase();
  } catch {
    return raw.toUpperCase();
  }
};

const generateInviteCode = () => Math.random().toString(36).slice(2, 10).toUpperCase();

const createUniqueInviteCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = generateInviteCode();
    const existing = await Room.findOne({ inviteCode: code }).select("_id");

    if (!existing) {
      return code;
    }
  }

  throw new Error("Unable to generate unique invite code");
};

const serializeRoom = (room) => ({
  _id: room._id,
  name: room.name,
  language: room.language,
  ownerId: room.ownerId,
  isPrivate: room.isPrivate,
  inviteCode: room.inviteCode,
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
});

const ensureAuth = (req, res) => {
  if (!req.user || !req.user.userId) {
    res.status(401).json({ message: "Not authorized" });
    return false;
  }

  return true;
};

const getUserRooms = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) {
      return;
    }

    const memberships = await RoomMember.find({ userId: req.user.userId }).sort({ joinedAt: -1 }).lean();
    const roomIds = memberships.map((member) => member.roomId);

    const rooms = await Room.find({ _id: { $in: roomIds } }).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ rooms: rooms.map(serializeRoom) });
  } catch (error) {
    console.error("Get rooms error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const getRecentRooms = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) {
      return;
    }

    const memberships = await RoomMember.find({ userId: req.user.userId }).sort({ joinedAt: -1 }).limit(8).lean();
    const roomIds = memberships.map((member) => member.roomId);
    const rooms = await Room.find({ _id: { $in: roomIds } }).sort({ updatedAt: -1 }).lean();

    return res.status(200).json({ rooms: rooms.map(serializeRoom) });
  } catch (error) {
    console.error("Get recent rooms error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const createRoom = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) {
      return;
    }

    const { name, language = "Python", isPrivate = true } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Room name is required" });
    }

    if (!ALLOWED_LANGUAGES.includes(language)) {
      return res.status(400).json({ message: "Unsupported room language" });
    }

    const inviteCode = await createUniqueInviteCode();

    const room = await Room.create({
      name: name.trim(),
      language,
      ownerId: req.user.userId,
      isPrivate,
      inviteCode,
    });

    await RoomMember.create({
      roomId: room._id,
      userId: req.user.userId,
      role: "owner",
    });

    const starter = starterFileMap[language] || starterFileMap.Python;
    await RoomFile.create({
      roomId: room._id,
      path: starter.path,
      language,
      content: starter.content,
    });

    return res.status(201).json({ room: serializeRoom(room) });
  } catch (error) {
    console.error("Create room error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const joinRoomByInvite = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) {
      return;
    }

    const { inviteCodeOrLink } = req.body;
    const inviteCode = getInviteCodeFromInput(inviteCodeOrLink);

    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code or link is required" });
    }

    const room = await Room.findOne({ inviteCode }).lean();

    if (!room) {
      return res.status(404).json({ message: "Room not found for this invite" });
    }

    const existingMembership = await RoomMember.findOne({ roomId: room._id, userId: req.user.userId });

    if (!existingMembership) {
      await RoomMember.create({
        roomId: room._id,
        userId: req.user.userId,
        role: "editor",
      });
    }

    return res.status(200).json({ room: serializeRoom(room) });
  } catch (error) {
    console.error("Join room by invite error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const joinRoomById = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) {
      return;
    }

    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ message: "Room id is required" });
    }

    const room = await Room.findById(roomId).lean();

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const existingMembership = await RoomMember.findOne({ roomId: room._id, userId: req.user.userId });

    if (!existingMembership) {
      await RoomMember.create({
        roomId: room._id,
        userId: req.user.userId,
        role: "editor",
      });
    }

    return res.status(200).json({ room: serializeRoom(room) });
  } catch (error) {
    console.error("Join room by id error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createRoom,
  getUserRooms,
  getRecentRooms,
  joinRoomByInvite,
  joinRoomById,
};