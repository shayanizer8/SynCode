const RoomInvitation = require("../models/RoomInvitation");
const RoomMember = require("../models/RoomMember");
const Room = require("../models/Room");
const User = require("../models/User");

const requireAuth = (req, res) => {
  if (!req.user || !req.user.userId) {
    res.status(401).json({ message: "Not authorized" });
    return false;
  }
  return true;
};

const listMyInvitations = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const userId = String(req.user.userId);
    const email = String(req.user.email || "").toLowerCase();
    const status = typeof req.query?.status === "string" ? req.query.status.trim() : "pending";
    const allowedStatuses = new Set(["pending", "accepted", "rejected", "cancelled", "all"]);
    const effectiveStatus = allowedStatuses.has(status) ? status : "pending";

    const query = {
      $or: [{ inviteeUserId: userId }, ...(email ? [{ inviteeEmail: email }] : [])],
    };

    if (effectiveStatus !== "all") {
      query.status = effectiveStatus;
    }

    const invitations = await RoomInvitation.find(query).sort({ createdAt: -1 }).limit(100).lean();

    const roomIds = Array.from(new Set(invitations.map((inv) => inv.roomId.toString())));
    const rooms = await Room.find({ _id: { $in: roomIds } }).select("name language ownerId").lean();
    const roomsById = new Map(rooms.map((room) => [room._id.toString(), room]));

    const inviterIds = Array.from(new Set(invitations.map((inv) => inv.inviterId.toString())));
    const inviters = await User.find({ _id: { $in: inviterIds } }).select("name email").lean();
    const inviterById = new Map(inviters.map((u) => [u._id.toString(), u]));

    return res.status(200).json({
      invitations: invitations.map((inv) => {
        const room = roomsById.get(inv.roomId.toString());
        const inviter = inviterById.get(inv.inviterId.toString());

        return {
          id: inv._id.toString(),
          roomId: inv.roomId.toString(),
          roomName: room?.name || "Unknown room",
          roomLanguage: room?.language || "",
          inviterId: inv.inviterId.toString(),
          inviterName: inviter?.name || "Unknown",
          inviterEmail: inviter?.email || "",
          inviteeEmail: inv.inviteeEmail,
          status: inv.status,
          createdAt: inv.createdAt,
          respondedAt: inv.respondedAt,
        };
      }),
    });
  } catch (error) {
    console.error("List invitations error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const acceptInvitation = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { invitationId } = req.params;
    const userId = String(req.user.userId);
    const email = String(req.user.email || "").toLowerCase();

    if (!invitationId) {
      return res.status(400).json({ message: "invitationId is required" });
    }

    const invitation = await RoomInvitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    const belongsToUser =
      String(invitation.inviteeUserId || "") === userId || (email && String(invitation.inviteeEmail || "").toLowerCase() === email);

    if (!belongsToUser) {
      return res.status(403).json({ message: "You cannot respond to this invitation" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: "Invitation is not pending" });
    }

    const room = await Room.findById(invitation.roomId).select("_id").lean();
    if (!room) {
      invitation.status = "cancelled";
      invitation.respondedAt = new Date();
      await invitation.save();
      return res.status(404).json({ message: "Room no longer exists" });
    }

    const existingMember = await RoomMember.findOne({ roomId: invitation.roomId, userId }).select("_id").lean();
    if (!existingMember) {
      await RoomMember.create({ roomId: invitation.roomId, userId, role: "editor" });
    }

    invitation.status = "accepted";
    invitation.respondedAt = new Date();
    invitation.inviteeUserId = userId;
    await invitation.save();

    return res.status(200).json({
      ok: true,
      roomId: invitation.roomId.toString(),
    });
  } catch (error) {
    console.error("Accept invitation error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const rejectInvitation = async (req, res) => {
  try {
    if (!requireAuth(req, res)) return;

    const { invitationId } = req.params;
    const userId = String(req.user.userId);
    const email = String(req.user.email || "").toLowerCase();

    if (!invitationId) {
      return res.status(400).json({ message: "invitationId is required" });
    }

    const invitation = await RoomInvitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    const belongsToUser =
      String(invitation.inviteeUserId || "") === userId || (email && String(invitation.inviteeEmail || "").toLowerCase() === email);

    if (!belongsToUser) {
      return res.status(403).json({ message: "You cannot respond to this invitation" });
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({ message: "Invitation is not pending" });
    }

    invitation.status = "rejected";
    invitation.respondedAt = new Date();
    invitation.inviteeUserId = userId;
    await invitation.save();

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Reject invitation error:", error.message);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  listMyInvitations,
  acceptInvitation,
  rejectInvitation,
};

