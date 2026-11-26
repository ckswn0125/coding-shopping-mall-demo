const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { PRODUCT_SIZES } = require("../models/Product");
const {
  getColorNames,
  getVariantStock,
  hasColorSizeStocks,
} = require("../utils/productStock");

// 유저 장바구니 가져오기 (없으면 생성)
async function findOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
}

// 상품 상세 채워서 응답
async function populateCart(cart) {
  return Cart.findById(cart._id).populate({
    path: "items.product",
    select: "sku name price image category status stock sizes colors",
  });
}

// GET /api/cart
const getCart = async (req, res, next) => {
  try {
    const cart = await findOrCreateCart(req.user.id);
    const populated = await populateCart(cart);
    res.json(populated);
  } catch (error) {
    next(error);
  }
};

// POST /api/cart/items  { productId, size, color?, quantity? }
const addCartItem = async (req, res, next) => {
  try {
    const { productId, size, color = "", quantity = 1 } = req.body;

    if (!productId || !size) {
      return res.status(400).json({
        message: "productId와 size는 필수입니다.",
      });
    }

    const normalizedSize = String(size).trim().toUpperCase();
    if (!PRODUCT_SIZES.includes(normalizedSize)) {
      return res.status(400).json({
        message: "유효하지 않은 사이즈입니다.",
      });
    }

    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty < 1) {
      return res.status(400).json({
        message: "quantity는 1 이상의 숫자여야 합니다.",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    if (product.status === "판매중지" || Number(product.stock) <= 0) {
      return res.status(400).json({ message: "현재 담을 수 없는 상품입니다." });
    }

    const productColors = getColorNames(product);
    const normalizedColor = String(color || "").trim();

    if (productColors.length > 0) {
      if (!normalizedColor) {
        return res.status(400).json({ message: "색상을 선택해 주세요." });
      }
      if (!productColors.includes(normalizedColor)) {
        return res.status(400).json({ message: "유효하지 않은 색상입니다." });
      }
    }

    const variantStock = getVariantStock(
      product,
      normalizedSize,
      normalizedColor
    );
    if (variantStock <= 0) {
      return res.status(400).json({
        message: hasColorSizeStocks(product)
          ? "선택한 색상/사이즈는 재고가 없습니다."
          : "선택한 사이즈는 재고가 없습니다.",
      });
    }

    const cart = await findOrCreateCart(req.user.id);

    const existing = cart.items.find(
      (item) =>
        String(item.product) === String(productId) &&
        item.size === normalizedSize &&
        (item.color || "") === normalizedColor
    );

    if (existing) {
      const nextQty = existing.quantity + qty;
      if (nextQty > variantStock) {
        return res.status(400).json({
          message: `재고가 부족합니다. (남은 재고 ${variantStock}개)`,
        });
      }
      existing.quantity = nextQty;
    } else {
      if (qty > variantStock) {
        return res.status(400).json({
          message: `재고가 부족합니다. (남은 재고 ${variantStock}개)`,
        });
      }
      cart.items.push({
        product: productId,
        size: normalizedSize,
        color: normalizedColor,
        quantity: qty,
      });
    }

    await cart.save();
    const populated = await populateCart(cart);

    res.status(201).json({
      message: "장바구니에 담았습니다.",
      cart: populated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// PATCH /api/cart/items/:itemId  { quantity }
const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const qty = Number(req.body.quantity);

    if (Number.isNaN(qty) || qty < 1) {
      return res.status(400).json({
        message: "quantity는 1 이상의 숫자여야 합니다.",
      });
    }

    const cart = await findOrCreateCart(req.user.id);
    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "장바구니 상품을 찾을 수 없습니다." });
    }

    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const variantStock = getVariantStock(
      product,
      item.size,
      item.color || ""
    );
    if (qty > variantStock) {
      return res.status(400).json({
        message: `재고가 부족합니다. (남은 재고 ${variantStock}개)`,
      });
    }

    item.quantity = qty;
    await cart.save();

    const populated = await populateCart(cart);
    res.json({
      message: "수량이 변경되었습니다.",
      cart: populated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/cart/items/:itemId
const removeCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const cart = await findOrCreateCart(req.user.id);
    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: "장바구니 상품을 찾을 수 없습니다." });
    }

    item.deleteOne();
    await cart.save();

    const populated = await populateCart(cart);
    res.json({
      message: "장바구니에서 삭제되었습니다.",
      cart: populated,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/cart
const clearCart = async (req, res, next) => {
  try {
    const cart = await findOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();

    const populated = await populateCart(cart);
    res.json({
      message: "장바구니를 비웠습니다.",
      cart: populated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
