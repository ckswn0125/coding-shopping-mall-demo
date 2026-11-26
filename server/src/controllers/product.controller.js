const Product = require("../models/Product");
const Order = require("../models/Order");
const {
  PRODUCT_CATEGORIES,
  PRODUCT_COLLECTIONS,
  PRODUCT_STATUSES,
  PRODUCT_SIZES,
} = require("../models/Product");

// 사이즈별 재고 정리: [{ size, stock }, ...]
function normalizeSizeStocks(sizes) {
  if (sizes === undefined || sizes === null) return undefined;
  const list = Array.isArray(sizes) ? sizes : [sizes];
  const map = new Map();

  for (const item of list) {
    if (item == null) continue;

    // 문자열만 온 경우 (예전 형식) → 재고 0
    if (typeof item === "string" || typeof item === "number") {
      const size = String(item).trim().toUpperCase();
      if (!PRODUCT_SIZES.includes(size)) continue;
      if (!map.has(size)) map.set(size, 0);
      continue;
    }

    const size = String(item.size ?? "").trim().toUpperCase();
    if (!PRODUCT_SIZES.includes(size)) continue;

    const stock = Number(item.stock);
    if (Number.isNaN(stock) || stock < 0) {
      return { error: "사이즈별 재고는 0 이상의 숫자여야 합니다." };
    }

    map.set(size, stock);
  }

  return [...map.entries()].map(([size, stock]) => ({ size, stock }));
}

function sumSizeStocks(sizeStocks) {
  return sizeStocks.reduce((sum, item) => sum + Number(item.stock || 0), 0);
}

// 색상×사이즈 재고 정리
// 입력: [{ color, sizes: [{ size, stock }] }] 또는 구형 ["Black"]
function normalizeColorStocks(colors) {
  if (colors === undefined || colors === null) return undefined;
  const list = Array.isArray(colors) ? colors : [colors];
  const result = [];
  const seen = new Set();

  for (const item of list) {
    if (item == null) continue;

    // 구형: 문자열만 → 색상명만 보관 (사이즈 재고는 product.sizes 사용)
    if (typeof item === "string" || typeof item === "number") {
      const color = String(item).trim();
      if (!color || seen.has(color)) continue;
      seen.add(color);
      result.push({ color, sizes: [] });
      continue;
    }

    const color = String(item.color || item.name || "").trim();
    if (!color || seen.has(color)) continue;
    seen.add(color);

    const sizeStocks = normalizeSizeStocks(item.sizes);
    if (sizeStocks?.error) return sizeStocks;
    result.push({ color, sizes: sizeStocks || [] });
  }

  return result;
}

function aggregateSizesFromColors(colorStocks) {
  const map = new Map();
  for (const entry of colorStocks) {
    for (const item of entry.sizes || []) {
      map.set(item.size, (map.get(item.size) || 0) + Number(item.stock || 0));
    }
  }
  return [...map.entries()].map(([size, stock]) => ({ size, stock }));
}

// 이미지 배열 정리 + 대표 이미지(image) 동기화
function normalizeImages(images, image) {
  const list = [];
  if (Array.isArray(images)) {
    for (const url of images) {
      const trimmed = String(url || "").trim();
      if (trimmed) list.push(trimmed);
    }
  }
  if (list.length === 0 && image) {
    const trimmed = String(image).trim();
    if (trimmed) list.push(trimmed);
  }
  return [...new Set(list)];
}

function withImagesFallback(product) {
  if (!product) return product;
  const obj = typeof product.toObject === "function" ? product.toObject() : product;
  const images = Array.isArray(obj.images) ? obj.images.filter(Boolean) : [];
  if (images.length === 0 && obj.image) {
    obj.images = [obj.image];
  } else {
    obj.images = images;
  }
  if (!obj.image && obj.images[0]) {
    obj.image = obj.images[0];
  }
  return obj;
}

function normalizeCollections(collections) {
  if (collections === undefined || collections === null) return undefined;
  const list = Array.isArray(collections) ? collections : [collections];
  const cleaned = [
    ...new Set(
      list
        .map((item) => String(item).trim())
        .filter((item) => PRODUCT_COLLECTIONS.includes(item))
    ),
  ];
  return cleaned;
}

// 상품 전체 조회
// GET /api/products?all=true                -> 전체 조회
// GET /api/products?category=아우터&all=true -> 카테고리 필터
// GET /api/products?page=1&limit=10         -> 페이지네이션 (기본 10개씩)
const getProducts = async (req, res, next) => {
  try {
    const filter = {};
    const category = req.query.category ? String(req.query.category).trim() : "";
    const collection = req.query.collection
      ? String(req.query.collection).trim()
      : "";
    const q = req.query.q ? String(req.query.q).trim() : "";

    if (category) {
      if (!PRODUCT_CATEGORIES.includes(category)) {
        return res.status(400).json({
          message: `category는 ${PRODUCT_CATEGORIES.join(", ")} 중 하나여야 합니다.`,
        });
      }
      filter.category = category;
    }

    if (collection) {
      if (!PRODUCT_COLLECTIONS.includes(collection)) {
        return res.status(400).json({
          message: `collection은 ${PRODUCT_COLLECTIONS.join(", ")} 중 하나여야 합니다.`,
        });
      }
      filter.collections = collection;
    }

    // 상품명/sku/카테고리 검색
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [
        { name: regex },
        { sku: regex },
        { category: regex },
        { description: regex },
      ];
    }

    // 메인/카테고리/컬렉션/검색 페이지 등에서 전체 상품이 필요할 때
    if (req.query.all === "true") {
      const products = await Product.find(filter).sort({ createdAt: -1 });
      return res.json({
        products: products.map(withImagesFallback),
        page: 1,
        limit: products.length,
        total: products.length,
        totalPages: 1,
        category: category || null,
        collection: collection || null,
        q: q || null,
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      products: products.map(withImagesFallback),
      page,
      limit,
      total,
      totalPages,
      category: category || null,
      collection: collection || null,
      q: q || null,
    });
  } catch (error) {
    next(error);
  }
};

// 상품 단건 조회
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    res.json(withImagesFallback(product));
  } catch (error) {
    next(error);
  }
};

// 상품 등록
// POST /api/products
const createProduct = async (req, res, next) => {
  try {
    const {
      sku,
      name,
      price,
      category,
      image,
      images,
      description,
      status,
      sizes,
      colors,
      collections,
    } = req.body;

    const normalizedImages = normalizeImages(images, image);

    if (
      !sku ||
      !name ||
      price === undefined ||
      price === null ||
      price === "" ||
      !category ||
      normalizedImages.length === 0
    ) {
      return res.status(400).json({
        message: "sku, 상품이름, 가격, 카테고리, 이미지는 필수입니다.",
      });
    }

    if (!PRODUCT_CATEGORIES.includes(category)) {
      return res.status(400).json({
        message: `category는 ${PRODUCT_CATEGORIES.join(", ")} 중 하나여야 합니다.`,
      });
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        message: "price는 0 이상의 숫자여야 합니다.",
      });
    }

    const colorStocks = normalizeColorStocks(colors);
    if (colorStocks?.error) {
      return res.status(400).json({ message: colorStocks.error });
    }

    const hasColorMatrix =
      Array.isArray(colorStocks) &&
      colorStocks.some((entry) => (entry.sizes || []).length > 0);

    let sizeStocks = normalizeSizeStocks(sizes) || [];
    if (sizeStocks.error) {
      return res.status(400).json({ message: sizeStocks.error });
    }

    if (hasColorMatrix) {
      sizeStocks = aggregateSizesFromColors(colorStocks);
    }

    if (sizeStocks.length === 0) {
      return res.status(400).json({
        message: "사이즈를 하나 이상 선택하고 재고를 입력해 주세요.",
      });
    }

    if (
      Array.isArray(colorStocks) &&
      colorStocks.length > 0 &&
      !hasColorMatrix
    ) {
      return res.status(400).json({
        message: "색상별 사이즈 재고를 입력해 주세요.",
      });
    }

    const numericStock = sumSizeStocks(sizeStocks);

    // 재고 0이면 기본 판매중지, 아니면 요청 status 또는 판매중
    let nextStatus = status || (numericStock === 0 ? "판매중지" : "판매중");
    if (!PRODUCT_STATUSES.includes(nextStatus)) {
      return res.status(400).json({
        message: "status는 판매중 또는 판매중지여야 합니다.",
      });
    }

    const product = await Product.create({
      sku: String(sku).trim().toUpperCase(),
      name: String(name).trim(),
      price: numericPrice,
      category,
      image: normalizedImages[0],
      images: normalizedImages,
      description: description ? String(description).trim() : "",
      stock: numericStock,
      status: nextStatus,
      sizes: sizeStocks,
      colors: colorStocks || [],
      collections: normalizeCollections(collections) || [],
    });

    res.status(201).json({
      message: "상품이 등록되었습니다.",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "이미 사용 중인 sku 입니다.",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// 상품 수정
const updateProduct = async (req, res, next) => {
  try {
    const allowedFields = [
      "sku",
      "name",
      "price",
      "category",
      "image",
      "images",
      "description",
      "stock",
      "status",
      "sizes",
      "colors",
      "collections",
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (updates.sku) {
      updates.sku = String(updates.sku).trim().toUpperCase();
    }

    if (updates.images !== undefined || updates.image !== undefined) {
      const normalizedImages = normalizeImages(updates.images, updates.image);
      if (normalizedImages.length === 0) {
        return res.status(400).json({
          message: "이미지는 최소 1장 필요합니다.",
        });
      }
      updates.images = normalizedImages;
      updates.image = normalizedImages[0];
    }

    // stock은 사이즈별 재고 합계로만 관리
    delete updates.stock;

    if (updates.colors !== undefined) {
      const colorStocks = normalizeColorStocks(updates.colors);
      if (colorStocks?.error) {
        return res.status(400).json({ message: colorStocks.error });
      }
      updates.colors = colorStocks || [];
    }

    const hasColorMatrix =
      Array.isArray(updates.colors) &&
      updates.colors.some((entry) => (entry.sizes || []).length > 0);

    if (hasColorMatrix) {
      updates.sizes = aggregateSizesFromColors(updates.colors);
      updates.stock = sumSizeStocks(updates.sizes);
      if (updates.stock === 0) {
        updates.status = "판매중지";
      }
    } else if (updates.sizes !== undefined) {
      const sizeStocks = normalizeSizeStocks(updates.sizes) || [];
      if (sizeStocks.error) {
        return res.status(400).json({ message: sizeStocks.error });
      }
      if (sizeStocks.length === 0) {
        return res.status(400).json({
          message: "사이즈를 하나 이상 선택하고 재고를 입력해 주세요.",
        });
      }
      updates.sizes = sizeStocks;
      updates.stock = sumSizeStocks(sizeStocks);
      if (updates.stock === 0) {
        updates.status = "판매중지";
      }
    }

    if (updates.collections !== undefined) {
      updates.collections = normalizeCollections(updates.collections) || [];
    }

    if (updates.category && !PRODUCT_CATEGORIES.includes(updates.category)) {
      return res.status(400).json({
        message: `category는 ${PRODUCT_CATEGORIES.join(", ")} 중 하나여야 합니다.`,
      });
    }

    if (updates.price !== undefined) {
      updates.price = Number(updates.price);
      if (Number.isNaN(updates.price) || updates.price < 0) {
        return res.status(400).json({
          message: "price는 0 이상의 숫자여야 합니다.",
        });
      }
    }

    if (updates.status && !PRODUCT_STATUSES.includes(updates.status)) {
      return res.status(400).json({
        message: "status는 판매중 또는 판매중지여야 합니다.",
      });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
      context: "query",
    });

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    res.json({
      message: "상품이 수정되었습니다.",
      product: withImagesFallback(product),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "이미 사용 중인 sku 입니다.",
      });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// 상품 삭제
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    res.json({ message: "상품이 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
};

// GET /api/products/bestsellers?limit=12&days=7
// 최근 N일 판매량 높은 순, 동점이면 랜덤
const getBestsellers = async (req, res, next) => {
  try {
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 12));
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const sales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: since },
          status: { $nin: ["주문취소", "환불완료"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          sold: { $sum: "$items.quantity" },
        },
      },
    ]);

    const soldMap = new Map(
      sales.map((row) => [String(row._id), Number(row.sold) || 0])
    );

    const products = await Product.find({ status: "판매중" });

    const ranked = products.map((product) => ({
      product: withImagesFallback(product),
      sold: soldMap.get(String(product._id)) || 0,
      rand: Math.random(),
    }));

    ranked.sort((a, b) => {
      if (b.sold !== a.sold) return b.sold - a.sold;
      return a.rand - b.rand;
    });

    const result = ranked.slice(0, limit).map((row) => ({
      ...row.product,
      weeklySold: row.sold,
    }));

    res.json({
      products: result,
      limit,
      days,
      total: result.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getBestsellers,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
