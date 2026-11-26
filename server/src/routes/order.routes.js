const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
} = require("../controllers/order.controller");

const router = express.Router();

// 주문 API는 로그인 필요
router.use(authMiddleware);

// CREATE  POST   /api/orders
router.post("/", createOrder);

// READ    GET    /api/orders          (내 주문 / admin 전체)
router.get("/", getOrders);

// READ    GET    /api/orders/:id
router.get("/:id", getOrderById);

// UPDATE  PUT    /api/orders/:id      (배송지/상태/결제수단)
router.put("/:id", updateOrder);

// DELETE  DELETE /api/orders/:id      (취소, admin?hard=true 면 삭제)
router.delete("/:id", deleteOrder);

module.exports = router;
