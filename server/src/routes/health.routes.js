const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

// GET /api/health
// 서버가 살아 있는지, MongoDB 연결 상태는 어떤지 확인
router.get("/", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.json({
    status: "ok",
    database: dbStatus[dbState] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
