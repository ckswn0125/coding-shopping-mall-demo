const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

// User 컬렉션 스키마 정의
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true, // 이메일 중복 불가
      trim: true,
      lowercase: true, // 소문자로 저장
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
        "Please enter a valid email address",
      ],
    },
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minlength: [6, "password must be at least 6 characters"],
    },
    phone: {
      type: String,
      required: [true, "phone is required"],
      trim: true,
    },
    // 회원 유형: 일반 고객 또는 관리자
    user_type: {
      type: String,
      required: [true, "user_type is required"],
      enum: {
        values: ["customer", "admin"],
        message: "user_type must be either customer or admin",
      },
      default: "customer",
    },
    // 약관 동의 정보
    agreements: {
      terms: {
        type: Boolean,
        required: [true, "terms agreement is required"],
        default: false,
      },
      privacy: {
        type: Boolean,
        required: [true, "privacy agreement is required"],
        default: false,
      },
      marketing: {
        type: Boolean,
        default: false, // 선택 동의
      },
    },
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

// 저장 직전에 비밀번호가 바뀌었으면 해시로 변환
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  // 이미 bcrypt 해시($2a/$2b/$2y)면 다시 암호화하지 않음
  if (/^\$2[aby]\$/.test(this.password)) {
    return;
  }

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

// 로그인 시 평문 비밀번호와 DB 해시 비교
userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
