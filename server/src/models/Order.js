const mongoose = require("mongoose");
const { PRODUCT_SIZES } = require("./Product");

// 주문 진행 상태
const ORDER_STATUSES = [
  "주문접수",
  "결제완료",
  "배송준비",
  "배송중",
  "배송완료",
  "주문취소",
  "환불완료",
];

// 결제 상태
const PAYMENT_STATUSES = ["결제대기", "결제완료", "결제실패", "환불완료"];

// 결제 수단 (목업)
const PAYMENT_METHODS = ["카드", "카카오페이", "토스페이", "무통장"];

// 주문 상품 (주문 시점 스냅샷)
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "product is required"],
    },
    sku: {
      type: String,
      required: [true, "sku is required"],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "image is required"],
      trim: true,
    },
    // 주문 시점 단가
    price: {
      type: Number,
      required: [true, "price is required"],
      min: [0, "price must be 0 or greater"],
    },
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
    color: {
      type: String,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      required: [true, "quantity is required"],
      min: [1, "quantity must be at least 1"],
    },
  },
  { _id: true }
);

// 배송지
const shippingAddressSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: [true, "recipient is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "phone is required"],
      trim: true,
    },
    zipCode: {
      type: String,
      required: [true, "zipCode is required"],
      trim: true,
    },
    address1: {
      type: String,
      required: [true, "address1 is required"],
      trim: true,
    },
    address2: {
      type: String,
      trim: true,
      default: "",
    },
    memo: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "user is required"],
      index: true,
    },
    // 주문번호 (예: VIBE-20261125-AB12)
    orderNumber: {
      type: String,
      required: [true, "orderNumber is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: {
        values: ORDER_STATUSES,
        message: `status must be one of ${ORDER_STATUSES.join(", ")}`,
      },
      default: "주문접수",
    },
    paymentStatus: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: `paymentStatus must be one of ${PAYMENT_STATUSES.join(", ")}`,
      },
      default: "결제대기",
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: `paymentMethod must be one of ${PAYMENT_METHODS.join(", ")}`,
      },
      required: [true, "paymentMethod is required"],
    },
    // 포트원 결제 정보
    impUid: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    merchantUid: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    paidAmount: {
      type: Number,
      min: [0, "paidAmount must be 0 or greater"],
      default: 0,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, "shippingAddress is required"],
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "items must contain at least one product",
      },
    },
    itemsAmount: {
      type: Number,
      required: [true, "itemsAmount is required"],
      min: [0, "itemsAmount must be 0 or greater"],
    },
    shippingFee: {
      type: Number,
      required: [true, "shippingFee is required"],
      min: [0, "shippingFee must be 0 or greater"],
      default: 0,
    },
    discountAmount: {
      type: Number,
      required: [true, "discountAmount is required"],
      min: [0, "discountAmount must be 0 or greater"],
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, "totalAmount is required"],
      min: [0, "totalAmount must be 0 or greater"],
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.index({ user: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
