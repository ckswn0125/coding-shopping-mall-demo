const express = require("express");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  getMe,
} = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// POST /api/users/login  -> 로그인 (토큰 발급)
router.post("/login", loginUser);

// GET  /api/users/me     -> 토큰으로 내 정보 조회
// Header: Authorization: Bearer <token>
router.get("/me", authMiddleware, getMe);

// GET  /api/users       -> 전체 유저 조회
router.get("/", getUsers);

// GET  /api/users/:id   -> 유저 단건 조회
router.get("/:id", getUserById);

// POST /api/users       -> 회원가입
router.post("/", createUser);

// PUT  /api/users/:id   -> 유저 수정
router.put("/:id", updateUser);

// DELETE /api/users/:id -> 유저 삭제
router.delete("/:id", deleteUser);

module.exports = router;
