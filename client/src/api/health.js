import { apiFetch } from "./client";

// 서버/DB 상태 확인 API
// GET /api/health
export function getHealth() {
  return apiFetch("/api/health");
}
