import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../api/auth";
import { getMyOrders, updateOrder } from "../api/orders";
import { deleteProduct, getProducts, updateProduct } from "../api/products";
import { deleteUser, getUsers, updateUser } from "../api/users";
import {
  clearAuthStorage,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";

const MENUS = [
  { id: "dashboard", label: "대시보드" },
  { id: "members", label: "회원 관리" },
  { id: "products", label: "상품 관리" },
  { id: "orders", label: "주문 관리" },
];

const ORDER_STATUSES = [
  "주문접수",
  "결제완료",
  "배송준비",
  "배송중",
  "배송완료",
  "주문취소",
  "환불완료",
];

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

function getOrderProductLabel(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length === 0) return "-";
  if (items.length === 1) return items[0].name;
  return `${items[0].name} 외 ${items.length - 1}건`;
}

function matchTabOrders(orders, tab) {
  if (!tab || tab.statuses === null) return orders;
  if (!tab.statuses.length) return [];
  return orders.filter((order) => tab.statuses.includes(order.status));
}

function Admin() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(() => getStoredUser());
  const [checking, setChecking] = useState(true);
  const [activeMenu, setActiveMenu] = useState("dashboard");

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);
  const [productTotalPages, setProductTotalPages] = useState(1);
  const PRODUCT_PAGE_SIZE = 10;
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderTabId, setOrderTabId] = useState("all");
  const [updatingOrderId, setUpdatingOrderId] = useState("");

  // 관리자 권한 확인
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    getMe()
      .then((result) => {
        const me = result.user;
        setAdmin(me);
        saveUser(me);

        if (me.user_type !== "admin") {
          navigate("/", { replace: true });
          return;
        }

        setChecking(false);
      })
      .catch(() => {
        clearAuthStorage();
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  // 관리자 진입 시 회원/상품 목록 불러오기
  useEffect(() => {
    if (checking) return;

    setMembersLoading(true);
    setMembersError("");

    getUsers()
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch((err) => setMembersError(err.message || "회원 조회 실패"))
      .finally(() => setMembersLoading(false));
  }, [checking]);

  // 상품 목록 페이지네이션 조회
  useEffect(() => {
    if (checking) return;

    setProductsLoading(true);
    setProductsError("");

    getProducts({ page: productPage, limit: PRODUCT_PAGE_SIZE })
      .then((data) => {
        setProducts(Array.isArray(data?.products) ? data.products : []);
        setProductTotal(data?.total ?? 0);
        setProductTotalPages(data?.totalPages ?? 1);
      })
      .catch((err) => setProductsError(err.message || "상품 조회 실패"))
      .finally(() => setProductsLoading(false));
  }, [checking, productPage]);

  // 전체 주문 목록 조회 (관리자)
  useEffect(() => {
    if (checking) return;

    setOrdersLoading(true);
    setOrdersError("");

    getMyOrders()
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch((err) => setOrdersError(err.message || "주문 조회 실패"))
      .finally(() => setOrdersLoading(false));
  }, [checking]);

  const activeOrderTab =
    ORDER_STATUS_TABS.find((tab) => tab.id === orderTabId) ||
    ORDER_STATUS_TABS[0];

  const orderTabCounts = useMemo(() => {
    const counts = {};
    for (const tab of ORDER_STATUS_TABS) {
      counts[tab.id] = matchTabOrders(orders, tab).length;
    }
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(
    () => matchTabOrders(orders, activeOrderTab),
    [orders, activeOrderTab]
  );

  const stats = useMemo(() => {
    const pendingOrders = orders.filter((item) =>
      ["주문접수", "결제완료", "배송준비", "배송중"].includes(item.status)
    ).length;

    return [
      { label: "전체 회원", value: members.length },
      { label: "등록 상품", value: productTotal },
      { label: "진행중 주문", value: pendingOrders },
      { label: "전체 주문", value: orders.length },
    ];
  }, [members.length, productTotal, orders]);

  const handleLogout = () => {
    clearAuthStorage();
    navigate("/login", { replace: true });
  };

  const handleToggleMemberType = async (member) => {
    const nextType = member.user_type === "admin" ? "customer" : "admin";

    try {
      const updated = await updateUser(member._id, { user_type: nextType });
      setMembers((prev) =>
        prev.map((item) => (item._id === member._id ? updated : item))
      );
    } catch (err) {
      window.alert(err.message || "권한 변경에 실패했습니다.");
    }
  };

  const handleDeleteMember = async (member) => {
    if (member._id === admin?._id) {
      window.alert("현재 로그인한 계정은 삭제할 수 없습니다.");
      return;
    }

    const ok = window.confirm(`${member.name} 회원을 삭제할까요?`);
    if (!ok) return;

    try {
      await deleteUser(member._id);
      setMembers((prev) => prev.filter((item) => item._id !== member._id));
    } catch (err) {
      window.alert(err.message || "회원 삭제에 실패했습니다.");
    }
  };

  const handleDeleteProduct = async (id) => {
    const ok = window.confirm("이 상품을 삭제할까요?");
    if (!ok) return;

    try {
      await deleteProduct(id);
      // 현재 페이지에 1개만 남았으면 이전 페이지로
      if (products.length <= 1 && productPage > 1) {
        setProductPage((prev) => prev - 1);
      } else {
        // 같은 페이지 다시 로드
        setProductsLoading(true);
        const data = await getProducts({
          page: productPage,
          limit: PRODUCT_PAGE_SIZE,
        });
        setProducts(Array.isArray(data?.products) ? data.products : []);
        setProductTotal(data?.total ?? 0);
        setProductTotalPages(data?.totalPages ?? 1);
        setProductsLoading(false);
      }
    } catch (err) {
      window.alert(err.message || "상품 삭제에 실패했습니다.");
    }
  };

  // 판매중 <-> 판매중지 토글
  const handleToggleProductStatus = async (product) => {
    const nextStatus = product.status === "판매중지" ? "판매중" : "판매중지";

    if (nextStatus === "판매중" && Number(product.stock) <= 0) {
      window.alert("재고가 0이라 판매중으로 변경할 수 없습니다. 재고를 먼저 수정해 주세요.");
      return;
    }

    try {
      const result = await updateProduct(product._id, { status: nextStatus });
      setProducts((prev) =>
        prev.map((item) => (item._id === product._id ? result.product : item))
      );
    } catch (err) {
      window.alert(err.message || "판매 상태 변경에 실패했습니다.");
    }
  };

  const handleOrderStatus = async (order, status) => {
    if (order.status === status) return;

    setUpdatingOrderId(order._id);
    try {
      const result = await updateOrder(order._id, { status });
      const updated = result.order || result;
      setOrders((prev) =>
        prev.map((item) => (item._id === order._id ? { ...item, ...updated } : item))
      );
    } catch (err) {
      window.alert(err.message || "주문 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingOrderId("");
    }
  };

  if (checking) {
    return null;
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Link to="/" className="admin-sidebar__logo" aria-label="홈으로 이동">
            VIBE
          </Link>
          <p className="admin-sidebar__sub">Admin Console</p>
        </div>

        <nav className="admin-sidebar__nav">
          {MENUS.map((menu) => (
            <button
              key={menu.id}
              type="button"
              className={`admin-sidebar__item${
                activeMenu === menu.id ? " is-active" : ""
              }`}
              onClick={() => setActiveMenu(menu.id)}
            >
              {menu.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <p className="admin-sidebar__user">{admin?.name} (admin)</p>
          <Link to="/" className="admin-sidebar__link">
            쇼핑몰로 이동
          </Link>
          <button
            type="button"
            className="admin-sidebar__logout"
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar__eyebrow">SHOPPING MALL ADMIN</p>
            <h1 className="admin-topbar__title">
              {MENUS.find((menu) => menu.id === activeMenu)?.label}
            </h1>
          </div>
          <p className="admin-topbar__hello">{admin?.name}님, 환영합니다</p>
        </header>

        {activeMenu === "dashboard" && (
          <section className="admin-section">
            <div className="admin-stats">
              {stats.map((stat) => (
                <article key={stat.label} className="admin-stat">
                  <p className="admin-stat__label">{stat.label}</p>
                  <p className="admin-stat__value">{stat.value}</p>
                </article>
              ))}
            </div>

            <div className="admin-grid-2">
              <article className="admin-card">
                <h2 className="admin-card__title">최근 주문</h2>
                <ul className="admin-simple-list">
                  {ordersLoading && (
                    <li>
                      <span>주문 불러오는 중...</span>
                      <strong>-</strong>
                    </li>
                  )}
                  {!ordersLoading && ordersError && (
                    <li>
                      <span>{ordersError}</span>
                      <strong>-</strong>
                    </li>
                  )}
                  {!ordersLoading &&
                    !ordersError &&
                    orders.slice(0, 4).map((order) => (
                      <li key={order._id}>
                        <span>{order.orderNumber}</span>
                        <strong>{order.status}</strong>
                      </li>
                    ))}
                  {!ordersLoading && !ordersError && orders.length === 0 && (
                    <li>
                      <span>주문이 없습니다</span>
                      <strong>-</strong>
                    </li>
                  )}
                </ul>
              </article>

              <article className="admin-card">
                <h2 className="admin-card__title">최근 등록 상품</h2>
                <ul className="admin-simple-list">
                  {products.slice(0, 4).map((item) => (
                    <li key={item._id}>
                      <span>{item.name}</span>
                      <strong>{item.category}</strong>
                    </li>
                  ))}
                  {products.length === 0 && (
                    <li>
                      <span>등록된 상품이 없습니다</span>
                    </li>
                  )}
                </ul>
              </article>
            </div>
          </section>
        )}

        {activeMenu === "members" && (
          <section className="admin-section">
            <div className="admin-card">
              <div className="admin-card__head">
                <h2 className="admin-card__title">회원 목록</h2>
                <p className="admin-card__desc">서버 회원 데이터를 관리합니다</p>
              </div>

              {membersLoading && <p className="admin-empty">회원 불러오는 중...</p>}
              {membersError && <p className="admin-error">{membersError}</p>}

              {!membersLoading && !membersError && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>이름</th>
                        <th>이메일</th>
                        <th>연락처</th>
                        <th>권한</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member._id}>
                          <td>{member.name}</td>
                          <td>{member.email}</td>
                          <td>{member.phone}</td>
                          <td>
                            <span
                              className={`admin-badge${
                                member.user_type === "admin" ? " is-admin" : ""
                              }`}
                            >
                              {member.user_type}
                            </span>
                          </td>
                          <td>
                            <div className="admin-actions">
                              <button
                                type="button"
                                className="admin-btn admin-btn--ghost"
                                onClick={() => handleToggleMemberType(member)}
                              >
                                권한변경
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn--danger"
                                onClick={() => handleDeleteMember(member)}
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {activeMenu === "products" && (
          <section className="admin-section">
            <div className="admin-card">
              <div className="admin-card__head admin-card__head--row">
                <div>
                  <h2 className="admin-card__title">상품 관리</h2>
                  <p className="admin-card__desc">
                    서버에 등록된 상품을 확인하고 새 상품을 추가합니다
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => navigate("/admin/products/new")}
                >
                  새 상품 등록하기
                </button>
              </div>

              {productsLoading && <p className="admin-empty">상품 불러오는 중...</p>}
              {productsError && <p className="admin-error">{productsError}</p>}

              {!productsLoading && !productsError && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>상품명</th>
                        <th>카테고리</th>
                        <th>가격</th>
                        <th>재고</th>
                        <th>상태</th>
                        <th>이미지</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product._id}>
                          <td>{product.sku}</td>
                          <td>{product.name}</td>
                          <td>{product.category}</td>
                          <td>{formatPrice(product.price)}</td>
                          <td>{product.stock ?? 0}</td>
                          <td>
                            <span
                              className={`admin-badge${
                                product.status === "판매중지" ? " is-warn" : ""
                              }`}
                            >
                              {product.status || "판매중"}
                            </span>
                          </td>
                          <td>
                            <img
                              className="admin-thumb"
                              src={product.image}
                              alt={product.name}
                            />
                          </td>
                          <td>
                            <div className="admin-actions">
                              <button
                                type="button"
                                className="admin-btn admin-btn--ghost"
                                onClick={() =>
                                  navigate(`/admin/products/${product._id}/edit`)
                                }
                              >
                                수정
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn--ghost"
                                onClick={() => handleToggleProductStatus(product)}
                              >
                                {product.status === "판매중지" ? "판매재개" : "판매중지"}
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn--danger"
                                onClick={() => handleDeleteProduct(product._id)}
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {products.length === 0 && (
                        <tr>
                          <td colSpan={8}>등록된 상품이 없습니다.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {productTotal > 0 && (
                    <div className="admin-pagination">
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        disabled={productPage <= 1 || productsLoading}
                        onClick={() => setProductPage((prev) => prev - 1)}
                      >
                        이전
                      </button>
                      <span className="admin-pagination__info">
                        {productPage} / {productTotalPages} 페이지
                        <em>(전체 {productTotal}개 · 페이지당 {PRODUCT_PAGE_SIZE}개)</em>
                      </span>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        disabled={
                          productPage >= productTotalPages || productsLoading
                        }
                        onClick={() => setProductPage((prev) => prev + 1)}
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {activeMenu === "orders" && (
          <section className="admin-section">
            <div className="admin-card">
              <h2 className="admin-card__title">주문 목록</h2>

              <div className="orders-dash" role="tablist" aria-label="주문상태">
                {ORDER_STATUS_TABS.map((tab) => {
                  const count = orderTabCounts[tab.id] ?? 0;
                  const isActive = orderTabId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={`orders-dash__chip${isActive ? " is-active" : ""}`}
                      onClick={() => setOrderTabId(tab.id)}
                    >
                      <span>{tab.label}</span>
                      {count > 0 && (
                        <span className="orders-dash__badge">{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {ordersLoading && <p className="admin-empty">주문 불러오는 중...</p>}
              {ordersError && <p className="admin-error">{ordersError}</p>}

              {!ordersLoading && !ordersError && (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>주문번호</th>
                        <th>고객</th>
                        <th>상품</th>
                        <th>금액</th>
                        <th>일자</th>
                        <th>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 && (
                        <tr>
                          <td colSpan={6}>해당 상태의 주문이 없습니다.</td>
                        </tr>
                      )}
                      {filteredOrders.map((order) => (
                        <tr key={order._id}>
                          <td>{order.orderNumber}</td>
                          <td>
                            {order.user?.name ||
                              order.shippingAddress?.recipient ||
                              "-"}
                          </td>
                          <td>{getOrderProductLabel(order)}</td>
                          <td>{formatPrice(order.totalAmount)}</td>
                          <td>{formatDate(order.createdAt)}</td>
                          <td>
                            <select
                              className="admin-select"
                              value={order.status}
                              disabled={updatingOrderId === order._id}
                              onChange={(event) =>
                                handleOrderStatus(order, event.target.value)
                              }
                            >
                              {ORDER_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default Admin;
