const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const healthRoutes = require("./routes/health.routes");
const userRoutes = require("./routes/user.routes");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const cartRoutes = require("./routes/cart.routes");
const orderRoutes = require("./routes/order.routes");

const app = express();

// 프론트(다른 포트)에서 API 호출할 수 있게 CORS 허용
app.use(cors());

// JSON / form 데이터를 req.body 로 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 개발 환경에서만 요청 로그 출력 (GET /api/users 200 등)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// 라우트 연결
app.use("/api/health", healthRoutes); // 서버/DB 상태 확인
app.use("/api/users", userRoutes); // 유저 CRUD + 로그인
app.use("/api/auth", authRoutes); // 인증 관련 (로그인)
app.use("/api/products", productRoutes); // 상품 CRUD
app.use("/api/cart", cartRoutes); // 장바구니
app.use("/api/orders", orderRoutes); // 주문

// 정의되지 않은 경로
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// 전역 에러 핸들러 (next(error) 로 넘어온 에러 처리)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

module.exports = app;
