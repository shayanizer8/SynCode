const express = require("express");
const { getTest } = require("../controllers/testController");

const router = express.Router();

router.get("/test", getTest);

module.exports = router;
