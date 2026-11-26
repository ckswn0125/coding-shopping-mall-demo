const express = require("express");
const { loginUser, getMe } = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/login -> 로그인 (토큰 발급)
router.post("/login", loginUser);

// GET /api/auth/me -> 토큰으로 내 정보 조회
// Header: Authorization: Bearer <token>
router.get("/me", authMiddleware, getMe);

module.exports = router;
