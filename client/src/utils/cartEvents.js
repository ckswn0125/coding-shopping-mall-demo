export const CART_UPDATED_EVENT = "cart:updated";

// 장바구니 변경 후 헤더 숫자 갱신
export function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}
