const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cart.controller");

const router = express.Router();

// 장바구니는 로그인 유저만 사용
router.use(authMiddleware);

// GET    /api/cart                 -> 내 장바구니 조회
router.get("/", getCart);

// POST   /api/cart/items           -> 상품 담기
router.post("/items", addCartItem);

// PATCH  /api/cart/items/:itemId   -> 수량 변경
router.patch("/items/:itemId", updateCartItem);

// DELETE /api/cart/items/:itemId   -> 상품 삭제
router.delete("/items/:itemId", removeCartItem);

// DELETE /api/cart                 -> 장바구니 비우기
router.delete("/", clearCart);

module.exports = router;
