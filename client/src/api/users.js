import { apiFetch } from "./client";

// 회원가입 API
export function createUser(payload) {
  return apiFetch("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// 전체 회원 조회 (관리자)
export function getUsers() {
  return apiFetch("/api/users", {
    method: "GET",
    auth: true,
  });
}

// 회원 정보 수정
export function updateUser(id, payload) {
  return apiFetch(`/api/users/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

// 회원 삭제
export function deleteUser(id) {
  return apiFetch(`/api/users/${id}`, {
    method: "DELETE",
    auth: true,
  });
}
