import { apiFetch } from "./client";

// 내 장바구니 조회
export function getCart() {
  return apiFetch("/api/cart", {
    method: "GET",
    auth: true,
  });
}

// 장바구니 담기
export function addCartItem({ productId, size, color = "", quantity = 1 }) {
  return apiFetch("/api/cart/items", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ productId, size, color, quantity }),
  });
}

// 수량 변경
export function updateCartItem(itemId, quantity) {
  return apiFetch(`/api/cart/items/${itemId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ quantity }),
  });
}

// 장바구니 상품 삭제
export function removeCartItem(itemId) {
  return apiFetch(`/api/cart/items/${itemId}`, {
    method: "DELETE",
    auth: true,
  });
}

// 장바구니 비우기
export function clearCart() {
  return apiFetch("/api/cart", {
    method: "DELETE",
    auth: true,
  });
}
