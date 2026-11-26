const bcrypt = require("bcrypt");
const User = require("../models/User");
const { createToken } = require("../utils/jwt");

// bcrypt 해시 강도 (숫자가 클수록 느리지만 더 안전)
const SALT_ROUNDS = 10;

// 전체 유저 조회 (비밀번호는 제외)
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// 특정 유저 단건 조회
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// 회원가입: 유저 생성
const createUser = async (req, res, next) => {
  try {
    const { email, name, password, phone, user_type, agreements } = req.body;

    // 필수값 체크
    if (!email || !name || !password || !phone) {
      return res.status(400).json({
        message: "email, name, password, phone are required",
      });
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(String(email).trim())) {
      return res.status(400).json({
        message: "Please enter a valid email address",
      });
    }

    // 필수 약관 동의 확인
    if (!agreements?.terms || !agreements?.privacy) {
      return res.status(400).json({
        message: "terms and privacy agreements are required",
      });
    }

    // 비밀번호는 DB에 평문으로 저장하지 않고 해시로 저장
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      email,
      name,
      password: hashedPassword,
      phone,
      user_type: user_type || "customer",
      agreements: {
        terms: Boolean(agreements.terms),
        privacy: Boolean(agreements.privacy),
        marketing: Boolean(agreements.marketing),
      },
    });

    // 응답에서는 password 제거
    const result = user.toObject();
    delete result.password;

    res.status(201).json({
      message: "User created successfully",
      user: result,
    });
  } catch (error) {
    // MongoDB unique 위반 (이메일 중복)
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// 유저 정보 수정
const updateUser = async (req, res, next) => {
  try {
    const allowedFields = [
      "email",
      "name",
      "password",
      "phone",
      "user_type",
      "agreements",
    ];
    const updates = {};

    // 보낸 필드만 업데이트 대상으로 모음
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // 비밀번호를 바꿀 때도 해시해서 저장
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true, // 수정된 최신 문서 반환
      runValidators: true,
      context: "query",
    }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// 유저 삭제
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
};

// 토큰으로 현재 로그인한 유저 정보 조회
// authMiddleware 가 먼저 실행되어 req.user 에 토큰 payload 가 들어있음
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "유저를 찾을 수 없습니다.",
      });
    }

    res.status(200).json({
      message: "유저 정보 조회 성공",
      user,
    });
  } catch (error) {
    next(error);
  }
};

// 로그인: 이메일 + 비밀번호 확인 후 JWT 토큰 발급
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1) 입력값 확인
    if (!email || !password) {
      return res.status(400).json({
        message: "이메일과 비밀번호를 입력해 주세요.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(String(email).trim())) {
      return res.status(400).json({
        message: "올바른 이메일 형식을 입력해 주세요.",
      });
    }

    // 2) 이메일로 유저 찾기
    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    });

    // 보안상 "이메일이 없다/비번이 틀렸다"를 구분하지 않음
    if (!user) {
      return res.status(401).json({
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    // 3) 입력한 비밀번호와 DB 해시 비밀번호 비교
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "이메일 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    // 4) 응답용 유저 정보 (password 제외)
    const result = user.toObject();
    delete result.password;

    // 5) JWT 토큰 발급 (.env 의 JWT_SECRET 으로 서명)
    const token = createToken(user);

    // 6) 클라이언트에 token + user 전달
    res.status(200).json({
      message: "로그인 성공",
      token,
      user: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  loginUser,
  getMe,
};
