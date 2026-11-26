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

function OrderSuccess() {
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
        setError(err.message || "주문 정보를 불러오지 못했습니다.");
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

      <main className="checkout-page order-success-page">
        {loading && <p className="cart-status">주문 확인 중...</p>}
        {error && <p className="cart-status cart-status--error">{error}</p>}

        {!loading && order && (
          <>
            <section className="order-success-hero co-section">
              <p className="order-success-hero__eyebrow">ORDER COMPLETE</p>
              <h1 className="order-success-hero__title">
                주문이 완료되었습니다
              </h1>
              <p className="order-success-hero__desc">
                주문해 주셔서 감사합니다. 결제와 배송 준비는 정상적으로
                접수되었습니다.
              </p>
              <p className="order-success-hero__number">
                주문번호 <strong>{order.orderNumber}</strong>
              </p>
            </section>

            <div className="checkout-layout order-success-layout">
              <section className="checkout-main">
                <section className="co-section">
                  <div className="co-section__head">
                    <h2>주문 정보</h2>
                  </div>
                  <div className="order-detail__meta">
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
                      <p className="order-detail__label">결제수단</p>
                      <p className="order-detail__value">
                        {order.paymentMethod}
                      </p>
                    </div>
                    <div>
                      <p className="order-detail__label">결제상태</p>
                      <p className="order-detail__value">
                        {order.paymentStatus}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="co-section">
                  <div className="co-section__head">
                    <h2>배송지</h2>
                  </div>
                  <p className="co-address__name">
                    {order.shippingAddress?.recipient}{" "}
                    <span>{order.shippingAddress?.phone}</span>
                  </p>
                  <p className="co-address__line">
                    ({order.shippingAddress?.zipCode}){" "}
                    {order.shippingAddress?.address1}{" "}
                    {order.shippingAddress?.address2}
                  </p>
                  {order.shippingAddress?.memo ? (
                    <p className="co-address__line">
                      요청사항: {order.shippingAddress.memo}
                    </p>
                  ) : null}
                </section>

                <section className="co-section">
                  <div className="co-section__head">
                    <h2>주문 상품</h2>
                  </div>
                  <ul className="co-items">
                    {order.items.map((item) => (
                      <li key={item._id} className="co-item">
                        <Link
                          to={`/products/${item.product}`}
                          className="co-item__thumb"
                        >
                          <img src={item.image} alt={item.name} />
                        </Link>
                        <div>
                          <p className="co-item__name">{item.name}</p>
                          <p className="co-item__option">
                            {[item.color, item.size].filter(Boolean).join(" · ")}
                            {" / "}
                            {item.quantity}개
                          </p>
                          <p className="co-item__price">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </section>

              <aside className="co-summary">
                <div className="co-summary__box">
                  <h2>결제 금액</h2>
                  <div className="co-summary__row">
                    <span>총 상품 금액</span>
                    <strong>{formatPrice(order.itemsAmount)}</strong>
                  </div>
                  <div className="co-summary__row">
                    <span>총 할인 금액</span>
                    <strong className="is-discount">
                      -{formatPrice(order.discountAmount || 0)}
                    </strong>
                  </div>
                  <div className="co-summary__row">
                    <span>배송비</span>
                    <strong>
                      {order.shippingFee === 0
                        ? "0원"
                        : formatPrice(order.shippingFee)}
                    </strong>
                  </div>
                  <div className="co-summary__total">
                    <span>총 결제 금액</span>
                    <strong>{formatPrice(order.totalAmount)}</strong>
                  </div>
                </div>

                <div className="order-success-actions">
                  <Link
                    to={`/orders/${order._id}`}
                    className="cart-btn cart-btn--ghost"
                  >
                    주문 상세 보기
                  </Link>
                  <Link to="/orders" className="cart-btn cart-btn--ghost">
                    주문 내역
                  </Link>
                  <Link to="/" className="cart-btn cart-btn--solid">
                    쇼핑 계속하기
                  </Link>
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

export default OrderSuccess;
