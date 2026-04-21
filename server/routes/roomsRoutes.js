const express = require("express");
const {
	createRoom,
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
} = require("../controllers/roomsController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getUserRooms);
router.get("/recent", protect, getRecentRooms);
router.get("/:roomId", protect, getRoomMetadata);
router.get("/:roomId/members", protect, getRoomMembers);
router.get("/:roomId/messages", protect, getRoomMessages);
router.post("/:roomId/messages", protect, sendRoomMessage);
router.get("/:roomId/content", protect, getRoomContent);
router.put("/:roomId/content", protect, updateRoomContent);
router.post("/", protect, createRoom);
router.post("/join", protect, joinRoomByInvite);
router.post("/join/:roomId", protect, joinRoomById);

module.exports = router;