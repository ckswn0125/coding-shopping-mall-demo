const jwt = require("jsonwebtoken");

// .env 에 있는 JWT_SECRET 값을 읽어옴 (토큰 서명/검증에 사용)
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return secret;
};

// 로그인 성공 시 JWT 토큰 생성
// payload(안에 넣을 정보): 유저 id, email, user_type
const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      user_type: user.user_type,
    },
    getJwtSecret(), // 서명에 쓰는 비밀키
    {
      // 토큰 만료 시간 (예: 7d = 7일). .env 의 JWT_EXPIRES_IN 사용
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

// 클라이언트가 보낸 토큰이 유효한지 검사
const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

module.exports = {
  createToken,
  verifyToken,
};
