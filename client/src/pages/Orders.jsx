import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../api/auth";
import { getMyOrders } from "../api/orders";
import HomeFooter from "../components/HomeFooter";
import HomeHeader from "../components/HomeHeader";
import {
  clearAuthStorage,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";

// 대시보드 탭 라벨 ↔ 실제 주문 status 매핑
const ORDER_STATUS_TABS = [
  { id: "all", label: "전체", statuses: null },
  {
    id: "confirmed",
    label: "주문확인",
    statuses: ["주문접수", "결제완료"],
  },
  {
    id: "preparing",
    label: "상품준비중",
    statuses: ["배송준비"],
  },
  {
    id: "ship_start",
    label: "배송시작",
    statuses: [],
  },
  {
    id: "shipping",
    label: "배송중",
    statuses: ["배송중"],
  },
  {
    id: "delivered",
    label: "배송완료",
    statuses: ["배송완료"],
  },
  {
    id: "canceled",
    label: "주문취소",
    statuses: ["주문취소", "환불완료"],
  },
];

function formatPrice(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("ko-KR");
}

function matchTabOrders(orders, tab) {
  if (!tab || tab.statuses === null) return orders;
  if (!tab.statuses.length) return [];
  return orders.filter((order) => tab.statuses.includes(order.status));
}

function Orders() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [orders, setOrders] = useState([]);
  const [activeTabId, setActiveTabId] = useState("all");
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
        return getMyOrders();
      })
      .then((data) => {
        if (cancelled) return;
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (String(err.message || "").includes("토큰")) {
          clearAuthStorage();
          navigate("/login", { replace: true });
          return;
        }
        setError(err.message || "주문 내역을 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const activeTab =
    ORDER_STATUS_TABS.find((tab) => tab.id === activeTabId) ||
    ORDER_STATUS_TABS[0];

  const statusCounts = useMemo(() => {
    const counts = {};
    for (const tab of ORDER_STATUS_TABS) {
      counts[tab.id] = matchTabOrders(orders, tab).length;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(
    () => matchTabOrders(orders, activeTab),
    [orders, activeTab]
  );

  const handleLogout = () => {
    clearAuthStorage();
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <div className="mall">
      <HomeHeader user={user} onLogout={handleLogout} />

      <main className="order-page">
        <h1 className="order-page__title">주문 내역</h1>

        <div className="orders-dash" role="tablist" aria-label="주문상태">
          {ORDER_STATUS_TABS.map((tab) => {
            const count = statusCounts[tab.id] ?? 0;
            const isActive = activeTabId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`orders-dash__chip${isActive ? " is-active" : ""}`}
                onClick={() => setActiveTabId(tab.id)}
              >
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className="orders-dash__badge">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {loading && <p className="cart-status">주문 내역 불러오는 중...</p>}
        {error && <p className="cart-status cart-status--error">{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <div className="cart-empty">
            <p>주문 내역이 없습니다.</p>
            <Link to="/" className="cart-btn cart-btn--solid">
              쇼핑하러 가기
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && (
          <div className="cart-empty">
            <p>{activeTab.label} 상태의 주문이 없습니다.</p>
            <button
              type="button"
              className="cart-btn cart-btn--ghost"
              onClick={() => setActiveTabId("all")}
            >
              전체 주문 보기
            </button>
          </div>
        )}

        {!loading && filteredOrders.length > 0 && (
          <ul className="orders-list">
            {filteredOrders.map((order) => (
              <li key={order._id} className="orders-card">
                <div className="orders-card__head">
                  <div>
                    <p className="orders-card__date">
                      {formatDate(order.createdAt)}
                    </p>
                    <p className="orders-card__number">{order.orderNumber}</p>
                  </div>
                  <span className="orders-card__status">{order.status}</span>
                </div>

                <ul className="orders-card__items">
                  {order.items.slice(0, 3).map((item) => (
                    <li key={item._id}>
                      <img src={item.image} alt={item.name} />
                      <div>
                        <p>{item.name}</p>
                        <span>
                          {[item.color, item.size].filter(Boolean).join(" · ")}
                          {" / "}
                          {item.quantity}개
                        </span>
                      </div>
                    </li>
                  ))}
                  {order.items.length > 3 && (
                    <li className="orders-card__more">
                      외 {order.items.length - 3}건
                    </li>
                  )}
                </ul>

                <div className="orders-card__foot">
                  <strong>{formatPrice(order.totalAmount)}</strong>
                  <Link
                    to={`/orders/${order._id}`}
                    className="cart-chip-btn"
                  >
                    상세보기
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

export default Orders;
