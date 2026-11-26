import { apiFetch } from "./client";

// 서버 로그인 API 호출
// 성공 시: { message, token, user } 반환
export function loginUser({ email, password }) {
  return apiFetch("/api/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// 토큰으로 내 유저 정보 조회
// Header: Authorization: Bearer <token>
export function getMe() {
  return apiFetch("/api/auth/me", {
    method: "GET",
    auth: true,
  });
}
