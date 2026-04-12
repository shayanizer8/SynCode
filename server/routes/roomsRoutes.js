const express = require("express");
const { getUserRooms } = require("../controllers/roomsController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getUserRooms);

module.exports = router;