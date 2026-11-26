const express = require("express");
const {
  getProducts,
  getBestsellers,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.controller");

const router = express.Router();

// GET  /api/products?all=true          -> 상품 전체 조회
// GET  /api/products?page=1&limit=10   -> 상품 페이지네이션 조회
router.get("/", getProducts);

// GET  /api/products/bestsellers       -> 주간 베스트 (판매량순, 동점 랜덤)
router.get("/bestsellers", getBestsellers);

// GET  /api/products/:id   -> 상품 단건 조회
router.get("/:id", getProductById);

// POST /api/products       -> 상품 등록 (등록 버튼에서 호출)
router.post("/", createProduct);

// PUT  /api/products/:id   -> 상품 수정
router.put("/:id", updateProduct);

// DELETE /api/products/:id -> 상품 삭제
router.delete("/:id", deleteProduct);

module.exports = router;
