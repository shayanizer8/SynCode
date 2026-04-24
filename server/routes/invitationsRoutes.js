const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { listMyInvitations, acceptInvitation, rejectInvitation } = require("../controllers/invitationsController");

const router = express.Router();

router.get("/", protect, listMyInvitations);
router.post("/:invitationId/accept", protect, acceptInvitation);
router.post("/:invitationId/reject", protect, rejectInvitation);

module.exports = router;

