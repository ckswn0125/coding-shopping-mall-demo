import { apiFetch } from "./client";

// 주문 목록 (일반: 내 주문 / admin: 전체)
export function getMyOrders() {
  return apiFetch("/api/orders", {
    method: "GET",
    auth: true,
  });
}

// 주문 상세
export function getOrderById(id) {
  return apiFetch(`/api/orders/${id}`, {
    method: "GET",
    auth: true,
  });
}

// 주문 생성 (포트원 결제 성공 후)
export function createOrder({
  cartItemIds,
  shippingAddress,
  paymentMethod,
  impUid,
  merchantUid,
}) {
  return apiFetch("/api/orders", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      cartItemIds,
      shippingAddress,
      paymentMethod,
      impUid,
      merchantUid,
    }),
  });
}

// 주문 수정 (배송지 / 상태 / 결제수단)
export function updateOrder(id, payload) {
  return apiFetch(`/api/orders/${id}`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(payload),
  });
}

// 주문 취소 (admin hard delete: hard=true)
export function deleteOrder(id, { hard = false } = {}) {
  const query = hard ? "?hard=true" : "";
  return apiFetch(`/api/orders/${id}${query}`, {
    method: "DELETE",
    auth: true,
  });
}
