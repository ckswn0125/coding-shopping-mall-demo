const mongoose = require("mongoose");

// 상품 카테고리 (고정 값)
const PRODUCT_CATEGORIES = ["아우터", "상의", "하의", "신발", "악세사리"];

// 홈 배너 컬렉션 (복수 선택 가능)
const PRODUCT_COLLECTIONS = ["시즌오프닝", "주간베스트", "회원특가"];

// 판매 상태
const PRODUCT_STATUSES = ["판매중", "판매중지"];

// 의류 사이즈
const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "FREE"];

// 신발 사이즈 (mm, 5 단위)
const SHOE_SIZES = Array.from({ length: 21 }, (_, i) => String(200 + i * 5));

// 전체 허용 사이즈 (의류 + 신발)
const PRODUCT_SIZES = [...CLOTHING_SIZES, ...SHOE_SIZES];

const productSchema = new mongoose.Schema(
  {
    // 상품 고유 코드 (항상 유니크)
    sku: {
      type: String,
      required: [true, "sku is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    // 상품 이름
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
    },
    // 상품 가격
    price: {
      type: Number,
      required: [true, "price is required"],
      min: [0, "price must be 0 or greater"],
    },
    // 카테고리
    category: {
      type: String,
      required: [true, "category is required"],
      enum: {
        values: PRODUCT_CATEGORIES,
        message: "category must be one of 아우터, 상의, 하의, 신발, 악세사리",
      },
    },
    // 대표 이미지 (images[0]과 동기화, 기존 호환)
    image: {
      type: String,
      required: [true, "image is required"],
      trim: true,
    },
    // 상품 이미지 여러 장 (Cloudinary secure_url)
    images: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    // 상품 설명 (선택)
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // 전체 재고 (색상×사이즈 합계)
    stock: {
      type: Number,
      required: [true, "stock is required"],
      min: [0, "stock must be 0 or greater"],
      default: 0,
    },
    // 누적 판매 수량
    soldCount: {
      type: Number,
      min: [0, "soldCount must be 0 or greater"],
      default: 0,
    },
    // 판매 상태 (판매중 / 판매중지)
    status: {
      type: String,
      enum: {
        values: PRODUCT_STATUSES,
        message: "status must be 판매중 or 판매중지",
      },
      default: "판매중",
    },
    // 사이즈별 재고 합계 (색상 합산 결과 / 색상 없을 때 직접 사용)
    sizes: {
      type: [
        {
          size: {
            type: String,
            required: true,
            enum: {
              values: PRODUCT_SIZES,
              message:
                "sizes must be clothing (XS~FREE) or shoe (200~300 step 5)",
            },
          },
          stock: {
            type: Number,
            required: true,
            min: [0, "size stock must be 0 or greater"],
            default: 0,
          },
        },
      ],
      default: [],
    },
    // 색상별 사이즈 재고
    // - 신규: [{ color, sizes: [{ size, stock }] }]
    // - 구형 데이터: ["Black", "White"] 문자열 배열도 허용
    colors: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    // 배너 컬렉션 (시즌오프닝 / 주간베스트 / 회원특가)
    collections: {
      type: [
        {
          type: String,
          enum: {
            values: PRODUCT_COLLECTIONS,
            message:
              "collections must be one of 시즌오프닝, 주간베스트, 회원특가",
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
module.exports.PRODUCT_CATEGORIES = PRODUCT_CATEGORIES;
module.exports.PRODUCT_COLLECTIONS = PRODUCT_COLLECTIONS;
module.exports.PRODUCT_STATUSES = PRODUCT_STATUSES;
module.exports.CLOTHING_SIZES = CLOTHING_SIZES;
module.exports.SHOE_SIZES = SHOE_SIZES;
module.exports.PRODUCT_SIZES = PRODUCT_SIZES;
