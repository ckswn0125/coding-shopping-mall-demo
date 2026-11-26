import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMe } from "../api/auth";
import { getOrderById } from "../api/orders";
import HomeFooter from "../components/HomeFooter";
import HomeHeader from "../components/HomeHeader";
import {
  clearAuthStorage,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";

function formatPrice(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    getMe()
      .then((result) => {
        if (cancelled) return;
        setUser(result.user);
        saveUser(result.user);
        return getOrderById(id);
      })
      .then((data) => {
        if (cancelled || !data) return;
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (String(err.message || "").includes("토큰")) {
          clearAuthStorage();
          navigate("/login", { replace: true });
          return;
        }
        setError(err.message || "주문을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const handleLogout = () => {
    clearAuthStorage();
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className="mall">
      <HomeHeader user={user} onLogout={handleLogout} />

      <main className="order-page">
        <h1 className="order-page__title">주문 상세</h1>

        {loading && <p className="cart-status">주문 불러오는 중...</p>}
        {error && <p className="cart-status cart-status--error">{error}</p>}

        {!loading && order && (
          <div className="order-detail">
            <section className="checkout-card">
              <div className="order-detail__meta">
                <div>
                  <p className="order-detail__label">주문번호</p>
                  <p className="order-detail__value">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="order-detail__label">주문일시</p>
                  <p className="order-detail__value">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="order-detail__label">주문상태</p>
                  <p className="order-detail__value">{order.status}</p>
                </div>
                <div>
                  <p className="order-detail__label">결제</p>
                  <p className="order-detail__value">
                    {order.paymentMethod} · {order.paymentStatus}
                  </p>
                </div>
              </div>
            </section>

            <section className="checkout-card">
              <h2>배송지</h2>
              <p className="order-address">
                {order.shippingAddress?.recipient} ·{" "}
                {order.shippingAddress?.phone}
                <br />
                ({order.shippingAddress?.zipCode}){" "}
                {order.shippingAddress?.address1}{" "}
                {order.shippingAddress?.address2}
                {order.shippingAddress?.memo
                  ? `\n메모: ${order.shippingAddress.memo}`
                  : ""}
              </p>
            </section>

            <section className="checkout-card">
              <h2>주문 상품</h2>
              <ul className="checkout-items">
                {order.items.map((item) => (
                  <li key={item._id}>
                    <img src={item.image} alt={item.name} />
                    <div>
                      <p className="checkout-items__name">{item.name}</p>
                      <p className="checkout-items__option">
                        {[item.color, item.size].filter(Boolean).join(" · ")}
                        {" / "}
                        {item.quantity}개
                      </p>
                    </div>
                    <strong>
                      {formatPrice(item.price * item.quantity)}
                    </strong>
                  </li>
                ))}
              </ul>
              <div className="order-amount">
                <div className="cart-summary__row">
                  <span>상품 금액</span>
                  <strong>{formatPrice(order.itemsAmount)}</strong>
                </div>
                <div className="cart-summary__row">
                  <span>배송비</span>
                  <strong>
                    {order.shippingFee === 0
                      ? "무료배송"
                      : formatPrice(order.shippingFee)}
                  </strong>
                </div>
                <div className="cart-summary__total">
                  <span>총 결제 금액</span>
                  <strong>{formatPrice(order.totalAmount)}</strong>
                </div>
              </div>
            </section>

            <div className="order-actions">
              <Link to="/orders" className="cart-btn cart-btn--ghost">
                주문 내역
              </Link>
              <Link to="/" className="cart-btn cart-btn--solid">
                쇼핑 계속하기
              </Link>
            </div>
          </div>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

export default OrderDetail;
