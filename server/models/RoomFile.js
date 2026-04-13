const mongoose = require("mongoose");

const roomFileSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    path: {
      type: String,
      required: true,
      trim: true,
    },
    language: {
      type: String,
      required: true,
      trim: true,
      default: "Python",
    },
    content: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

roomFileSchema.index({ roomId: 1, path: 1 }, { unique: true });

module.exports = mongoose.model("RoomFile", roomFileSchema);