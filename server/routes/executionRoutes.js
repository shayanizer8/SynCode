const express = require("express");
const { executeCode } = require("../controllers/executionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, executeCode);

module.exports = router;