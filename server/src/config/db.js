const mongoose = require("mongoose");

// MongoDB 연결 함수
const connectDB = async () => {
  const uri = process.env.MONGODB_URI; // 예: mongodb://127.0.0.1:27017/shoping-mall

  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}`);
};

module.exports = connectDB;
