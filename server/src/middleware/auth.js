const { verifyToken } = require("../utils/jwt");

// Authorization 헤더의 JWT를 검사하고 req.user 에 토큰 정보를 넣음
// 예: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "인증 토큰이 필요합니다.",
      });
    }

    // "Bearer " 뒤의 토큰 문자열만 추출
    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: "인증 토큰이 필요합니다.",
      });
    }

    // 토큰 검증 성공 시 payload(id, email, user_type)가 decoded 에 담김
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    // 만료되었거나 서명이 잘못된 토큰
    return res.status(401).json({
      message: "유효하지 않거나 만료된 토큰입니다.",
    });
  }
};

module.exports = authMiddleware;
