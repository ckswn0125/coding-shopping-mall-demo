const Cart = require("../models/Cart");
const Order = require("../models/Order");
const Product = require("../models/Product");
const {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} = require("../models/Order");
const { verifyPayment } = require("../utils/portone");
const {
  getVariantStock,
  deductVariantStock,
} = require("../utils/productStock");

function createOrderNumber() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VIBE-${y}${m}${d}-${rand}`;
}

function calcShippingFee(itemsAmount) {
  // 5만원 이상 무료배송
  return itemsAmount >= 50000 ? 0 : 3000;
}

// 주문 생성 전: 동일 결제(impUid / merchantUid)로 이미 주문이 있는지 확인
async function findDuplicateOrder(impUid, merchantUid) {
  return Order.findOne({
    $or: [{ impUid }, { merchantUid }],
  });
}

// POST /api/orders
// body: { cartItemIds, shippingAddress, paymentMethod, impUid, merchantUid }
const createOrder = async (req, res, next) => {
  try {
    const {
      cartItemIds,
      shippingAddress,
      paymentMethod,
      impUid,
      merchantUid,
    } = req.body;

    if (!Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      return res.status(400).json({
        message: "주문할 장바구니 상품을 선택해 주세요.",
      });
    }

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        message: `paymentMethod는 ${PAYMENT_METHODS.join(", ")} 중 하나여야 합니다.`,
      });
    }

    if (!impUid || !merchantUid) {
      return res.status(400).json({
        message: "결제 정보(impUid, merchantUid)가 필요합니다.",
      });
    }

    const normalizedImpUid = String(impUid).trim();
    const normalizedMerchantUid = String(merchantUid).trim();

    // 1) 주문 생성 전 — 중복 주문 여부 체크
    const existingOrder = await findDuplicateOrder(
      normalizedImpUid,
      normalizedMerchantUid
    );
    if (existingOrder) {
      return res.status(409).json({
        message: "이미 처리된 결제입니다. 주문이 중복 생성되지 않았습니다.",
        order: existingOrder,
      });
    }

    if (
      !shippingAddress ||
      !shippingAddress.recipient ||
      !shippingAddress.phone ||
      !shippingAddress.zipCode ||
      !shippingAddress.address1
    ) {
      return res.status(400).json({
        message: "받는 사람, 연락처, 우편번호, 기본 주소는 필수입니다.",
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "장바구니가 비어 있습니다." });
    }

    const selectedItems = cart.items.filter((item) =>
      cartItemIds.includes(String(item._id))
    );

    if (selectedItems.length === 0) {
      return res.status(400).json({
        message: "선택한 장바구니 상품을 찾을 수 없습니다.",
      });
    }

    const orderItems = [];
    let itemsAmount = 0;
    const productsToSave = [];

    for (const cartItem of selectedItems) {
      const product = await Product.findById(cartItem.product);
      if (!product) {
        return res.status(404).json({
          message: "주문 중 상품을 찾을 수 없습니다.",
        });
      }

      if (product.status === "판매중지") {
        return res.status(400).json({
          message: `${product.name}은(는) 판매중지 상태입니다.`,
        });
      }

      const variantStock = getVariantStock(
        product,
        cartItem.size,
        cartItem.color || ""
      );
      if (variantStock < cartItem.quantity) {
        const optionLabel = [cartItem.color, cartItem.size]
          .filter(Boolean)
          .join(" / ");
        return res.status(400).json({
          message: `${product.name} (${optionLabel || cartItem.size}) 재고가 부족합니다. (남은 재고 ${variantStock}개)`,
        });
      }

      // 색상×사이즈 재고 차감 준비 (검증 통과 후에만 DB 저장)
      deductVariantStock(
        product,
        cartItem.size,
        cartItem.color || "",
        cartItem.quantity
      );
      product.soldCount =
        (Number(product.soldCount) || 0) + Number(cartItem.quantity || 0);
      if (product.stock === 0) {
        product.status = "판매중지";
      }
      productsToSave.push(product);

      orderItems.push({
        product: product._id,
        sku: product.sku,
        name: product.name,
        image: product.image,
        price: product.price,
        size: cartItem.size,
        color: cartItem.color || "",
        quantity: cartItem.quantity,
      });
      itemsAmount += product.price * cartItem.quantity;
    }

    const shippingFee = calcShippingFee(itemsAmount);
    const discountAmount = 0;
    const totalAmount = itemsAmount - discountAmount + shippingFee;

    // 2) 주문 생성 전 — 포트원 결제 검증 (금액·merchant_uid·결제상태)
    let paymentResult;
    try {
      paymentResult = await verifyPayment({
        impUid: normalizedImpUid,
        merchantUid: normalizedMerchantUid,
        expectedAmount: totalAmount,
        allowReady: paymentMethod === "무통장",
      });
    } catch (verifyError) {
      return res.status(400).json({
        message: verifyError.message || "결제 검증에 실패했습니다.",
      });
    }

    // 결제 검증 중 동시 요청이 들어왔을 수 있으므로 한 번 더 중복 확인
    const raceDuplicate = await findDuplicateOrder(
      normalizedImpUid,
      normalizedMerchantUid
    );
    if (raceDuplicate) {
      return res.status(409).json({
        message: "이미 처리된 결제입니다. 주문이 중복 생성되지 않았습니다.",
        order: raceDuplicate,
      });
    }

    const isPaid = paymentResult.paid;
    const orderStatus = isPaid ? "결제완료" : "주문접수";
    const payStatus = isPaid ? "결제완료" : "결제대기";
    const paidAmount = isPaid
      ? Number(paymentResult.payment?.amount ?? totalAmount)
      : 0;

    // 검증 통과 후 재고 반영
    for (const product of productsToSave) {
      await product.save();
    }

    const order = await Order.create({
      user: req.user.id,
      orderNumber: createOrderNumber(),
      status: orderStatus,
      paymentStatus: payStatus,
      paymentMethod,
      impUid: normalizedImpUid,
      merchantUid: normalizedMerchantUid,
      paidAmount,
      shippingAddress: {
        recipient: String(shippingAddress.recipient).trim(),
        phone: String(shippingAddress.phone).trim(),
        zipCode: String(shippingAddress.zipCode).trim(),
        address1: String(shippingAddress.address1).trim(),
        address2: shippingAddress.address2
          ? String(shippingAddress.address2).trim()
          : "",
        memo: shippingAddress.memo
          ? String(shippingAddress.memo).trim()
          : "",
      },
      items: orderItems,
      itemsAmount,
      shippingFee,
      discountAmount,
      totalAmount,
    });

    // 주문한 장바구니 아이템 제거
    cart.items = cart.items.filter(
      (item) => !cartItemIds.includes(String(item._id))
    );
    await cart.save();

    res.status(201).json({
      message: isPaid
        ? "결제가 완료되어 주문이 생성되었습니다."
        : "주문이 접수되었습니다. (입금 대기)",
      order,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    // unique index 충돌 등 동시 생성 방어
    if (error.code === 11000) {
      return res.status(409).json({
        message: "이미 처리된 결제입니다. 주문이 중복 생성되지 않았습니다.",
      });
    }
    next(error);
  }
};

// GET /api/orders
// 일반 유저: 내 주문 / 관리자: 전체 주문 (?mine=true 면 내 주문만)
const getOrders = async (req, res, next) => {
  try {
    const filter =
      req.user.user_type === "admin" && req.query.mine !== "true"
        ? {}
        : { user: req.user.id };

    const orders = await Order.find(filter)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    if (
      String(order.user) !== String(req.user.id) &&
      req.user.user_type !== "admin"
    ) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

// PUT /api/orders/:id
// - 본인: 배송 전이면 배송지/결제수단 수정, 또는 주문취소
// - 관리자: status / paymentStatus / shippingAddress / paymentMethod 수정
const updateOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const isOwner = String(order.user) === String(req.user.id);
    const isAdmin = req.user.user_type === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }

    const { shippingAddress, paymentMethod, status, paymentStatus } = req.body;
    const updates = {};

    // 본인 주문 취소
    if (!isAdmin && status === "주문취소") {
      if (["배송중", "배송완료", "환불완료"].includes(order.status)) {
        return res.status(400).json({
          message: "배송이 시작된 주문은 취소할 수 없습니다.",
        });
      }
      updates.status = "주문취소";
      updates.paymentStatus = "환불완료";
    }

    // 배송지 수정 (본인: 배송 전만 / 관리자: 항상)
    if (shippingAddress !== undefined) {
      if (
        !isAdmin &&
        ["배송중", "배송완료", "주문취소", "환불완료"].includes(order.status)
      ) {
        return res.status(400).json({
          message: "현재 상태에서는 배송지를 수정할 수 없습니다.",
        });
      }

      if (
        !shippingAddress.recipient ||
        !shippingAddress.phone ||
        !shippingAddress.zipCode ||
        !shippingAddress.address1
      ) {
        return res.status(400).json({
          message: "받는 사람, 연락처, 우편번호, 기본 주소는 필수입니다.",
        });
      }

      updates.shippingAddress = {
        recipient: String(shippingAddress.recipient).trim(),
        phone: String(shippingAddress.phone).trim(),
        zipCode: String(shippingAddress.zipCode).trim(),
        address1: String(shippingAddress.address1).trim(),
        address2: shippingAddress.address2
          ? String(shippingAddress.address2).trim()
          : "",
        memo: shippingAddress.memo ? String(shippingAddress.memo).trim() : "",
      };
    }

    // 결제수단 수정 (본인: 결제대기/주문접수만)
    if (paymentMethod !== undefined) {
      if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return res.status(400).json({
          message: `paymentMethod는 ${PAYMENT_METHODS.join(", ")} 중 하나여야 합니다.`,
        });
      }
      if (
        !isAdmin &&
        !["주문접수", "결제대기"].includes(order.status) &&
        order.paymentStatus !== "결제대기"
      ) {
        return res.status(400).json({
          message: "결제가 완료된 주문은 결제수단을 변경할 수 없습니다.",
        });
      }
      updates.paymentMethod = paymentMethod;
    }

    // 상태 변경은 관리자만 (본인 취소는 위에서 처리)
    if (isAdmin) {
      if (status !== undefined) {
        if (!ORDER_STATUSES.includes(status)) {
          return res.status(400).json({
            message: `status는 ${ORDER_STATUSES.join(", ")} 중 하나여야 합니다.`,
          });
        }
        updates.status = status;
      }
      if (paymentStatus !== undefined) {
        if (!PAYMENT_STATUSES.includes(paymentStatus)) {
          return res.status(400).json({
            message: `paymentStatus는 ${PAYMENT_STATUSES.join(", ")} 중 하나여야 합니다.`,
          });
        }
        updates.paymentStatus = paymentStatus;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "수정할 필드가 없습니다.",
      });
    }

    const updated = await Order.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.json({
      message: "주문이 수정되었습니다.",
      order: updated,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// DELETE /api/orders/:id
// - 본인: 배송 전 주문 취소(소프트 삭제 = 상태 변경)
// - 관리자: DB에서 완전 삭제
const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const isOwner = String(order.user) === String(req.user.id);
    const isAdmin = req.user.user_type === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "접근 권한이 없습니다." });
    }

    // 관리자: 하드 삭제
    if (isAdmin && req.query.hard === "true") {
      await order.deleteOne();
      return res.json({ message: "주문이 삭제되었습니다." });
    }

    // 본인/관리자 공통: 취소 처리
    if (["배송중", "배송완료", "환불완료"].includes(order.status)) {
      return res.status(400).json({
        message: "배송이 시작된 주문은 취소할 수 없습니다.",
      });
    }

    if (order.status === "주문취소") {
      return res.status(400).json({ message: "이미 취소된 주문입니다." });
    }

    order.status = "주문취소";
    order.paymentStatus = "환불완료";
    await order.save();

    res.json({
      message: "주문이 취소되었습니다.",
      order,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
};
