const mongoose = require("mongoose");

const roomInvitationSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },
    inviterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    inviteeEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    inviteeUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

roomInvitationSchema.index({ roomId: 1, inviteeEmail: 1, status: 1 });
roomInvitationSchema.index({ roomId: 1, inviteeUserId: 1, status: 1 });

module.exports = mongoose.model("RoomInvitation", roomInvitationSchema);

