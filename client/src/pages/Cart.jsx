import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../api/auth";
import {
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../api/cart";
import { getAllProducts } from "../api/products";
import HomeFooter from "../components/HomeFooter";
import HomeHeader from "../components/HomeHeader";
import {
  clearAuthStorage,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";
import { notifyCartUpdated } from "../utils/cartEvents";

const CART_TABS = ["전체", "VIBE", "무료배송"];

function formatPrice(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function Cart() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeTab, setActiveTab] = useState("전체");
  const [recommends, setRecommends] = useState([]);

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
        return Promise.all([getCart(), getAllProducts()]);
      })
      .then((result) => {
        if (cancelled || !result) return;
        const [cartData, productData] = result;
        const items = Array.isArray(cartData?.items) ? cartData.items : [];
        setCart(cartData);
        setSelectedIds(items.map((item) => item._id));
        const list = Array.isArray(productData?.products)
          ? productData.products
          : [];
        setRecommends(
          list
            .filter((item) => item.status === "판매중")
            .slice(0, 4)
        );
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (String(err.message || "").includes("토큰")) {
          clearAuthStorage();
          navigate("/login", { replace: true });
          return;
        }
        setError(err.message || "장바구니를 불러오지 못했습니다.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = () => {
    clearAuthStorage();
    setUser(null);
    navigate("/login", { replace: true });
  };

  const items = Array.isArray(cart?.items) ? cart.items : [];

  // 카테고리(브랜드 역할)별로 묶기
  const groupedItems = useMemo(() => {
    const groups = new Map();
    for (const item of items) {
      const key = item.product?.category || "기타";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return [...groups.entries()];
  }, [items]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item._id)),
    [items, selectedIds]
  );

  const productAmount = useMemo(
    () =>
      selectedItems.reduce((sum, item) => {
        const price = Number(item.product?.price) || 0;
        return sum + price * Number(item.quantity || 0);
      }, 0),
    [selectedItems]
  );

  const shippingFee = selectedItems.length > 0 ? 0 : 0;
  const discountAmount = 0;
  const totalPrice = productAmount - discountAmount + shippingFee;
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const syncSelected = (nextCart) => {
    const nextItems = Array.isArray(nextCart?.items) ? nextCart.items : [];
    setSelectedIds((prev) =>
      prev.filter((id) => nextItems.some((item) => item._id === id))
    );
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(items.map((item) => item._id));
  };

  const handleToggleItem = (itemId) => {
    setSelectedIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleQuantityChange = async (itemId, quantity) => {
    const next = Number(quantity);
    if (Number.isNaN(next) || next < 1) return;

    setBusyId(itemId);
    setError("");
    try {
      const result = await updateCartItem(itemId, next);
      setCart(result.cart);
      syncSelected(result.cart);
      notifyCartUpdated();
    } catch (err) {
      window.alert(err.message || "수량 변경에 실패했습니다.");
    } finally {
      setBusyId("");
    }
  };

  const handleRemove = async (itemId) => {
    const ok = window.confirm("이 상품을 장바구니에서 삭제할까요?");
    if (!ok) return;

    setBusyId(itemId);
    setError("");
    try {
      const result = await removeCartItem(itemId);
      setCart(result.cart);
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
      notifyCartUpdated();
    } catch (err) {
      window.alert(err.message || "삭제에 실패했습니다.");
    } finally {
      setBusyId("");
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedIds.length === 0) {
      window.alert("삭제할 상품을 선택해 주세요.");
      return;
    }
    const ok = window.confirm(
      `선택한 ${selectedIds.length}개 상품을 삭제할까요?`
    );
    if (!ok) return;

    setBusyId("selected");
    try {
      let nextCart = cart;
      for (const itemId of selectedIds) {
        const result = await removeCartItem(itemId);
        nextCart = result.cart;
      }
      setCart(nextCart);
      setSelectedIds([]);
      notifyCartUpdated();
    } catch (err) {
      window.alert(err.message || "선택 삭제에 실패했습니다.");
    } finally {
      setBusyId("");
    }
  };

  const handleClear = async () => {
    if (items.length === 0) return;
    const ok = window.confirm("장바구니를 모두 비울까요?");
    if (!ok) return;

    setBusyId("clear");
    try {
      const result = await clearCart();
      setCart(result.cart);
      setSelectedIds([]);
      notifyCartUpdated();
    } catch (err) {
      window.alert(err.message || "장바구니 비우기에 실패했습니다.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="mall">
      <HomeHeader user={user} onLogout={handleLogout} />

      <main className="cart-page">
        <h1 className="cart-page__title">장바구니</h1>

        <div className="cart-tabs" role="tablist">
          {CART_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              className={`cart-tab${activeTab === tab ? " is-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "전체" ? ` ${items.length}` : ""}
            </button>
          ))}
        </div>

        {loading && <p className="cart-status">장바구니 불러오는 중...</p>}
        {error && <p className="cart-status cart-status--error">{error}</p>}

        {!loading && !error && items.length === 0 && (
          <div className="cart-empty">
            <p>장바구니가 비어 있습니다.</p>
            <Link to="/" className="cart-btn cart-btn--solid">
              쇼핑 계속하기
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="cart-layout">
            <section className="cart-main">
              <div className="cart-toolbar">
                <label className="cart-check">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleAll}
                  />
                  <span>전체선택</span>
                </label>
                <div className="cart-toolbar__actions">
                  <button
                    type="button"
                    className="cart-text-btn"
                    onClick={handleRemoveSelected}
                    disabled={busyId === "selected"}
                  >
                    선택삭제
                  </button>
                  <button
                    type="button"
                    className="cart-text-btn"
                    onClick={handleClear}
                    disabled={busyId === "clear"}
                  >
                    전체삭제
                  </button>
                </div>
              </div>

              {groupedItems.map(([category, group]) => (
                <article key={category} className="cart-group">
                  <header className="cart-group__head">
                    <label className="cart-check">
                      <input
                        type="checkbox"
                        checked={group.every((item) =>
                          selectedIds.includes(item._id)
                        )}
                        onChange={() => {
                          const ids = group.map((item) => item._id);
                          const everySelected = ids.every((id) =>
                            selectedIds.includes(id)
                          );
                          setSelectedIds((prev) =>
                            everySelected
                              ? prev.filter((id) => !ids.includes(id))
                              : [...new Set([...prev, ...ids])]
                          );
                        }}
                      />
                      <span className="cart-group__brand">{category}</span>
                    </label>
                  </header>

                  <ul className="cart-list">
                    {group.map((item) => {
                      const product = item.product || {};
                      const lineTotal =
                        (Number(product.price) || 0) *
                        Number(item.quantity || 0);
                      const optionText = [
                        item.color,
                        item.size,
                      ]
                        .filter(Boolean)
                        .join(" · ");

                      return (
                        <li key={item._id} className="cart-item">
                          <label className="cart-check cart-item__check">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item._id)}
                              onChange={() => handleToggleItem(item._id)}
                            />
                          </label>

                          <Link
                            to={`/products/${product._id}`}
                            className="cart-item__thumb"
                          >
                            <img
                              src={product.image}
                              alt={product.name || "상품"}
                            />
                          </Link>

                          <div className="cart-item__body">
                            <Link
                              to={`/products/${product._id}`}
                              className="cart-item__name"
                            >
                              {product.name || "삭제된 상품"}
                            </Link>
                            <p className="cart-item__option">
                              {optionText}
                              {optionText ? " / " : ""}
                              {item.quantity}개
                            </p>
                            <p className="cart-item__price">
                              {formatPrice(lineTotal)}
                            </p>

                            <div className="cart-item__controls">
                              <div className="cart-stepper">
                                <button
                                  type="button"
                                  disabled={
                                    busyId === item._id || item.quantity <= 1
                                  }
                                  onClick={() =>
                                    handleQuantityChange(
                                      item._id,
                                      item.quantity - 1
                                    )
                                  }
                                >
                                  −
                                </button>
                                <span>{item.quantity}</span>
                                <button
                                  type="button"
                                  disabled={busyId === item._id}
                                  onClick={() =>
                                    handleQuantityChange(
                                      item._id,
                                      item.quantity + 1
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
                              <button
                                type="button"
                                className="cart-chip-btn"
                                onClick={() =>
                                  navigate(`/products/${product._id}`)
                                }
                              >
                                옵션 변경
                              </button>
                              <button
                                type="button"
                                className="cart-chip-btn"
                                disabled={busyId === item._id}
                                onClick={() => handleRemove(item._id)}
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </article>
              ))}

              {recommends.length > 0 && (
                <section className="cart-recommend">
                  <h2>함께 보면 좋을 상품</h2>
                  <div className="cart-recommend__grid">
                    {recommends.map((product) => (
                      <Link
                        key={product._id}
                        to={`/products/${product._id}`}
                        className="cart-recommend__card"
                      >
                        <div className="cart-recommend__media">
                          <img src={product.image} alt={product.name} />
                        </div>
                        <p className="cart-recommend__brand">
                          {product.category}
                        </p>
                        <p className="cart-recommend__name">{product.name}</p>
                        <p className="cart-recommend__price">
                          {formatPrice(product.price)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </section>

            <aside className="cart-summary">
              <div className="cart-summary__box">
                <h2>구매 금액</h2>
                <div className="cart-summary__row">
                  <span>상품 금액</span>
                  <strong>{formatPrice(productAmount)}</strong>
                </div>
                <div className="cart-summary__row">
                  <span>할인 금액</span>
                  <strong>{formatPrice(discountAmount)}</strong>
                </div>
                <div className="cart-summary__row">
                  <span>배송비</span>
                  <strong className="is-free">
                    {shippingFee === 0 ? "무료배송" : formatPrice(shippingFee)}
                  </strong>
                </div>
                <div className="cart-summary__total">
                  <span>총 구매 금액</span>
                  <strong>{formatPrice(totalPrice)}</strong>
                </div>
                <p className="cart-summary__hint">
                  {selectedItems.length}개 상품 · 적립 예정 최대 0원
                </p>
              </div>

              <div className="cart-summary__box cart-summary__box--soft">
                <h3>결제 혜택</h3>
                <ul>
                  <li>카드사 무이자 할부 확인</li>
                  <li>카카오페이 / 토스페이 즉시할인</li>
                  <li>5만원 이상 무료배송</li>
                </ul>
              </div>

              <button
                type="button"
                className="cart-btn cart-btn--solid cart-btn--buy"
                disabled={selectedItems.length === 0}
                onClick={() => {
                  if (selectedItems.length === 0) {
                    window.alert("주문할 상품을 선택해 주세요.");
                    return;
                  }
                  const ids = selectedItems.map((item) => String(item._id));
                  sessionStorage.setItem(
                    "checkoutItemIds",
                    JSON.stringify(ids)
                  );
                  navigate("/checkout", { state: { cartItemIds: ids } });
                }}
              >
                {selectedItems.length}개 · {formatPrice(totalPrice)} 결제하기
              </button>
            </aside>
          </div>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

export default Cart;
