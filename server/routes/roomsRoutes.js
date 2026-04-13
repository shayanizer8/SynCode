const express = require("express");
const {
	createRoom,
	getUserRooms,
	getRecentRooms,
	joinRoomByInvite,
	joinRoomById,
} = require("../controllers/roomsController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getUserRooms);
router.get("/recent", protect, getRecentRooms);
router.post("/", protect, createRoom);
router.post("/join", protect, joinRoomByInvite);
router.post("/join/:roomId", protect, joinRoomById);

module.exports = router;