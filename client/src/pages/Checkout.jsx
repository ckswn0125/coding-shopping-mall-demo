import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getMe } from "../api/auth";
import { getCart } from "../api/cart";
import { createOrder } from "../api/orders";
import HomeFooter from "../components/HomeFooter";
import HomeHeader from "../components/HomeHeader";
import {
  clearAuthStorage,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";
import { notifyCartUpdated } from "../utils/cartEvents";

const PAYMENT_METHODS = ["카드", "카카오페이", "토스페이", "무통장"];
const DELIVERY_MEMOS = [
  "배송 요청사항을 선택해주세요",
  "문 앞에 놓아주세요",
  "경비실에 맡겨주세요",
  "배송 전 연락 부탁드려요",
  "직접 입력",
];

// 결제수단 → 포트원 pg / pay_method
// 테스트 식별코드에는 계약된 PG만 사용 가능 → 공식 샘플과 동일하게 html5_inicis 사용
function getPortOnePayConfig(method) {
  switch (method) {
    case "무통장":
      return { pg: "html5_inicis", pay_method: "vbank" };
    case "카드":
    case "카카오페이":
    case "토스페이":
    default:
      return { pg: "html5_inicis", pay_method: "card" };
  }
}

function formatPrice(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("카드");
  const [memoOption, setMemoOption] = useState(DELIVERY_MEMOS[0]);
  const [form, setForm] = useState({
    recipient: "",
    phone: "",
    zipCode: "",
    address1: "",
    address2: "",
    memo: "",
  });

  const cartItemIds = useMemo(() => {
    const fromState = location.state?.cartItemIds;
    if (Array.isArray(fromState) && fromState.length > 0) {
      return fromState.map(String);
    }
    try {
      const saved = sessionStorage.getItem("checkoutItemIds");
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }, [location.state]);

  // 포트원 결제 모듈 초기화 (고객사 식별코드)
  useEffect(() => {
    if (!window.IMP) return;
    window.IMP.init("imp47211623");
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (cartItemIds.length === 0) {
      navigate("/cart", { replace: true });
      return;
    }

    let cancelled = false;

    getMe()
      .then((result) => {
        if (cancelled) return;
        setUser(result.user);
        saveUser(result.user);
        setForm((prev) => ({
          ...prev,
          recipient: prev.recipient || result.user.name || "",
          phone: prev.phone || result.user.phone || "",
        }));
        return getCart();
      })
      .then((cart) => {
        if (cancelled || !cart) return;
        const selected = (cart.items || []).filter((item) =>
          cartItemIds.includes(String(item._id))
        );
        if (selected.length === 0) {
          navigate("/cart", { replace: true });
          return;
        }
        setItems(selected);
        // 주소가 비어 있으면 수정 모드로 시작
        setEditingAddress(true);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (String(err.message || "").includes("토큰")) {
          clearAuthStorage();
          navigate("/login", { replace: true });
          return;
        }
        setError(err.message || "주문 정보를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cartItemIds, navigate]);

  const itemsAmount = useMemo(
    () =>
      items.reduce((sum, item) => {
        const price = Number(item.product?.price) || 0;
        return sum + price * Number(item.quantity || 0);
      }, 0),
    [items]
  );
  const discountAmount = 0;
  const shippingFee = itemsAmount >= 50000 ? 0 : 3000;
  const totalAmount = itemsAmount - discountAmount + shippingFee;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemoOption = (event) => {
    const value = event.target.value;
    setMemoOption(value);
    if (value === "직접 입력") {
      setForm((prev) => ({ ...prev, memo: "" }));
      return;
    }
    if (value === DELIVERY_MEMOS[0]) {
      setForm((prev) => ({ ...prev, memo: "" }));
      return;
    }
    setForm((prev) => ({ ...prev, memo: value }));
  };

  const handleLogout = () => {
    clearAuthStorage();
    setUser(null);
    navigate("/login", { replace: true });
  };

  const saveAddressPreview = () => {
    if (
      !form.recipient.trim() ||
      !form.phone.trim() ||
      !form.zipCode.trim() ||
      !form.address1.trim()
    ) {
      setError("받는 사람, 연락처, 우편번호, 기본 주소는 필수입니다.");
      return;
    }
    setError("");
    setEditingAddress(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    if (
      !form.recipient.trim() ||
      !form.phone.trim() ||
      !form.zipCode.trim() ||
      !form.address1.trim()
    ) {
      setError("받는 사람, 연락처, 우편번호, 기본 주소는 필수입니다.");
      setEditingAddress(true);
      return;
    }

    if (!window.IMP) {
      setError("결제 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
      return;
    }

    const { IMP } = window;
    const { pg, pay_method } = getPortOnePayConfig(paymentMethod);
    const firstName = items[0]?.product?.name || "VIBE 상품";
    const orderName =
      items.length > 1
        ? `주문명:${firstName} 외 ${items.length - 1}건`
        : `주문명:${firstName}`;
    // 상점에서 관리하는 주문 번호
    const merchantUid = `order_no_${Date.now()}`;
    const buyerAddr =
      `${form.address1.trim()} ${form.address2.trim()}`.trim() ||
      "주소 미입력";

    // 결제 성공 후 주문 생성에 쓸 배송 정보 (모바일 리다이렉트 대비 임시 저장)
    sessionStorage.setItem(
      "pendingOrder",
      JSON.stringify({
        cartItemIds,
        paymentMethod,
        shippingAddress: {
          recipient: form.recipient.trim(),
          phone: form.phone.trim(),
          zipCode: form.zipCode.trim(),
          address1: form.address1.trim(),
          address2: form.address2.trim(),
          memo: form.memo.trim(),
        },
      })
    );

    setSubmitting(true);

    // 포트원 공식 request_pay 파라미터 형식
    // https://developers.portone.io/docs/ko/sdk/javascript-sdk/payrq
    IMP.request_pay(
      {
        pg, // 예: html5_inicis
        pay_method, // 예: card
        merchant_uid: merchantUid, // 상점에서 관리하는 주문 번호
        name: orderName, // 주문명
        amount: totalAmount, // 결제 금액
        buyer_email: user?.email || "guest@vibe.mall",
        buyer_name: form.recipient.trim(),
        buyer_tel: form.phone.trim(),
        buyer_addr: buyerAddr,
        buyer_postcode: form.zipCode.trim(),
        // 모바일에서 결제 완료 후 리디렉션될 URL
        m_redirect_url: `${window.location.origin}/checkout/complete`,
      },
      async function (rsp) {
        // callback 로직 (PC 결제)
        if (!rsp.success) {
          setSubmitting(false);
          setError(rsp.error_msg || "결제가 취소되었거나 실패했습니다.");
          return;
        }

        // 결제 성공 → 서버에서 결제 검증 후 주문 생성
        try {
          const result = await createOrder({
            cartItemIds,
            paymentMethod,
            impUid: rsp.imp_uid,
            merchantUid: rsp.merchant_uid || merchantUid,
            shippingAddress: {
              recipient: form.recipient.trim(),
              phone: form.phone.trim(),
              zipCode: form.zipCode.trim(),
              address1: form.address1.trim(),
              address2: form.address2.trim(),
              memo: form.memo.trim(),
            },
          });
          sessionStorage.removeItem("checkoutItemIds");
          sessionStorage.removeItem("pendingOrder");
          notifyCartUpdated();
          navigate(`/orders/${result.order._id}/success`, { replace: true });
        } catch (err) {
          setError(
            err.message ||
              "결제는 완료되었지만 주문 저장에 실패했습니다. 고객센터로 문의해 주세요."
          );
        } finally {
          setSubmitting(false);
        }
      }
    );
  };

  const hasAddress =
    form.recipient.trim() &&
    form.phone.trim() &&
    form.zipCode.trim() &&
    form.address1.trim();

  return (
    <div className="mall">
      <HomeHeader user={user} onLogout={handleLogout} />

      <main className="checkout-page">
        <h1 className="checkout-page__title">주문서</h1>

        {loading && <p className="cart-status">주문 정보 불러오는 중...</p>}
        {error && <p className="cart-status cart-status--error">{error}</p>}

        {!loading && items.length > 0 && (
          <form className="checkout-layout" onSubmit={handleSubmit}>
            <section className="checkout-main">
              {/* 배송지 */}
              <section className="co-section">
                <div className="co-section__head">
                  <h2>배송지</h2>
                  {!editingAddress && hasAddress && (
                    <button
                      type="button"
                      className="co-text-btn"
                      onClick={() => setEditingAddress(true)}
                    >
                      배송지 변경
                    </button>
                  )}
                </div>

                {!editingAddress && hasAddress ? (
                  <div className="co-address">
                    <p className="co-address__name">
                      {form.recipient}{" "}
                      <span>{form.phone}</span>
                    </p>
                    <p className="co-address__line">
                      ({form.zipCode}) {form.address1} {form.address2}
                    </p>
                  </div>
                ) : (
                  <div className="co-form">
                    <label>
                      <span>받는 사람</span>
                      <input
                        name="recipient"
                        value={form.recipient}
                        onChange={handleChange}
                        required
                      />
                    </label>
                    <label>
                      <span>연락처</span>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="010-0000-0000"
                        required
                      />
                    </label>
                    <label>
                      <span>우편번호</span>
                      <input
                        name="zipCode"
                        value={form.zipCode}
                        onChange={handleChange}
                        required
                      />
                    </label>
                    <label className="co-form__full">
                      <span>기본 주소</span>
                      <input
                        name="address1"
                        value={form.address1}
                        onChange={handleChange}
                        required
                      />
                    </label>
                    <label className="co-form__full">
                      <span>상세 주소</span>
                      <input
                        name="address2"
                        value={form.address2}
                        onChange={handleChange}
                      />
                    </label>
                    <div className="co-form__actions">
                      <button
                        type="button"
                        className="cart-btn cart-btn--solid"
                        onClick={saveAddressPreview}
                      >
                        배송지 저장
                      </button>
                    </div>
                  </div>
                )}

                <label className="co-select">
                  <span>배송 요청사항</span>
                  <select value={memoOption} onChange={handleMemoOption}>
                    {DELIVERY_MEMOS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                {memoOption === "직접 입력" && (
                  <input
                    className="co-memo-input"
                    name="memo"
                    value={form.memo}
                    onChange={handleChange}
                    placeholder="요청사항을 입력해 주세요"
                  />
                )}
              </section>

              {/* 주문 상품 */}
              <section className="co-section">
                <div className="co-section__head">
                  <h2>주문 상품 {items.length}개</h2>
                </div>
                <ul className="co-items">
                  {items.map((item) => {
                    const product = item.product || {};
                    const lineTotal =
                      (Number(product.price) || 0) * Number(item.quantity || 0);
                    return (
                      <li key={item._id} className="co-item">
                        <Link
                          to={`/products/${product._id}`}
                          className="co-item__thumb"
                        >
                          <img
                            src={product.image}
                            alt={product.name || "상품"}
                          />
                        </Link>
                        <div className="co-item__body">
                          <p className="co-item__brand">
                            {product.category || "VIBE"}
                          </p>
                          <Link
                            to={`/products/${product._id}`}
                            className="co-item__name"
                          >
                            {product.name}
                          </Link>
                          <p className="co-item__option">
                            {[item.color, item.size]
                              .filter(Boolean)
                              .join(" / ")}{" "}
                            · {item.quantity}개
                          </p>
                          <p className="co-item__price">
                            {formatPrice(lineTotal)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              {/* 할인 (UI 목업) */}
              <section className="co-section">
                <div className="co-section__head">
                  <h2>할인</h2>
                </div>
                <div className="co-discount">
                  <div className="co-discount__row">
                    <span>상품 쿠폰</span>
                    <select disabled defaultValue="">
                      <option value="">사용 가능한 쿠폰 없음</option>
                    </select>
                  </div>
                  <div className="co-discount__row">
                    <span>적립금</span>
                    <div className="co-discount__point">
                      <input type="number" min="0" value={0} disabled />
                      <button type="button" className="co-text-btn" disabled>
                        전액사용
                      </button>
                    </div>
                  </div>
                  <p className="co-discount__hint">보유 적립금 0원</p>
                </div>
              </section>

              {/* 결제 수단 */}
              <section className="co-section">
                <div className="co-section__head">
                  <h2>결제 수단</h2>
                </div>
                <div className="co-pay">
                  {PAYMENT_METHODS.map((method) => (
                    <label
                      key={method}
                      className={`co-pay__card${
                        paymentMethod === method ? " is-selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method}
                        checked={paymentMethod === method}
                        onChange={() => setPaymentMethod(method)}
                      />
                      <span>{method}</span>
                    </label>
                  ))}
                </div>
              </section>
            </section>

            <aside className="co-summary">
              <div className="co-summary__box">
                <h2>결제 금액</h2>
                <div className="co-summary__row">
                  <span>총 상품 금액</span>
                  <strong>{formatPrice(itemsAmount)}</strong>
                </div>
                <div className="co-summary__row">
                  <span>총 할인 금액</span>
                  <strong className="is-discount">
                    -{formatPrice(discountAmount)}
                  </strong>
                </div>
                <div className="co-summary__row">
                  <span>배송비</span>
                  <strong>
                    {shippingFee === 0 ? "0원" : formatPrice(shippingFee)}
                  </strong>
                </div>
                <div className="co-summary__total">
                  <span>총 결제 금액</span>
                  <strong>{formatPrice(totalAmount)}</strong>
                </div>
                <p className="co-summary__hint">
                  5만원 이상 구매 시 무료배송
                </p>
              </div>

              <button
                type="submit"
                className="co-pay-btn"
                disabled={submitting}
              >
                {submitting
                  ? "결제 중..."
                  : `${formatPrice(totalAmount)} 결제하기`}
              </button>
              <Link to="/cart" className="co-back">
                장바구니로 돌아가기
              </Link>
            </aside>
          </form>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

export default Checkout;
