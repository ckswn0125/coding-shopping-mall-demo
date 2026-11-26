const mongoose = require("mongoose");
const { PRODUCT_SIZES } = require("./Product");

// 장바구니 아이템 (상품 + 옵션 + 수량)
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "product is required"],
    },
    // 선택한 사이즈
    size: {
      type: String,
      required: [true, "size is required"],
      uppercase: true,
      trim: true,
      enum: {
        values: PRODUCT_SIZES,
        message:
          "size must be clothing (XS~FREE) or shoe (200~300 step 5)",
      },
    },
    // 선택한 색상 (상품에 색상이 있을 때)
    color: {
      type: String,
      trim: true,
      default: "",
    },
    // 담은 수량
    quantity: {
      type: Number,
      required: [true, "quantity is required"],
      min: [1, "quantity must be at least 1"],
      default: 1,
    },
  },
  {
    _id: true,
  }
);

// 사용자당 장바구니 1개
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user is required"],
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// 같은 상품 + 사이즈 + 색상은 한 줄로 합치기 위한 조회용 인덱스
cartSchema.index({ user: 1 });

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
