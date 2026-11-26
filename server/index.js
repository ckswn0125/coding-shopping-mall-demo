// .env 파일의 환경변수(PORT, MONGODB_URI, JWT_SECRET 등)를 불러옴
require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;
const LOCAL_MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/shoping-mall";

// Atlas 값이 있으면 사용, 없으면 로컬 사용
const atlasUri = (process.env.MONGODB_URL_ATLAS_URL || "").trim();
process.env.MONGODB_URI = atlasUri || LOCAL_MONGODB_URI;

// 서버 시작: DB 연결 후 Express 앱 실행
const startServer = async () => {
  try {
    await connectDB(); // MongoDB 연결
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1); // 연결 실패 시 프로세스 종료
  }
};

startServer();
