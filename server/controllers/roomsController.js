const Room = require("../models/Room");

const getUserRooms = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const rooms = await Room.find({ user: req.user.userId }).sort({ updatedAt: -1 });
    return res.status(200).json({ rooms });
  } catch (error) {
    console.error("Get rooms error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getUserRooms,
};