import { memo, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getCart } from "../api/cart";
import { searchProducts } from "../api/products";
import { clearAuthStorage } from "../utils/authStorage";
import { CART_UPDATED_EVENT } from "../utils/cartEvents";

function CartIcon() {
  return (
    <svg
      className="mall-header__cart-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 14h9.45c.75 0 1.4-.41 1.74-1.07l3.3-6.1A1 1 0 0 0 20.8 5H6.21l-.54-1.27A1 1 0 0 0 4.76 3H2v2h2l3.6 7.59-1.35 2.44A2 2 0 0 0 8 17h12v-2H8.42l.78-1.41z"
      />
    </svg>
  );
}

function formatPrice(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function HomeHeader({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const isAdmin = user?.user_type === "admin";

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    if (!menuOpen && !searchOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, searchOpen]);

  // 로그인 시 장바구니 아이템 수량 합계 조회
  useEffect(() => {
    if (!user) {
      setCartCount(0);
      return;
    }

    let cancelled = false;

    const loadCount = () => {
      getCart()
        .then((cart) => {
          if (cancelled) return;
          const items = Array.isArray(cart?.items) ? cart.items : [];
          const total = items.reduce(
            (sum, item) => sum + Number(item.quantity || 0),
            0
          );
          setCartCount(total);
        })
        .catch(() => {
          if (!cancelled) setCartCount(0);
        });
    };

    loadCount();
    window.addEventListener(CART_UPDATED_EVENT, loadCount);

    return () => {
      cancelled = true;
      window.removeEventListener(CART_UPDATED_EVENT, loadCount);
    };
  }, [user, location.pathname]);

  // 검색어 자동완성 (디바운스)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);

    const timer = setTimeout(() => {
      searchProducts(q, { limit: 8 })
        .then((data) => {
          if (cancelled) return;
          const list = Array.isArray(data?.products) ? data.products : [];
          setSuggestions(
            list.filter((item) => item.status !== "판매중지").slice(0, 8)
          );
          setSearchOpen(true);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const handleLogout = () => {
    setMenuOpen(false);
    clearAuthStorage();
    if (typeof onLogout === "function") {
      onLogout();
    }
    navigate("/login", { replace: true });
  };

  const goSearchPage = (value = query) => {
    const q = String(value || "").trim();
    if (!q) return;
    setSearchOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    goSearchPage();
  };

  const cartLabel =
    cartCount > 0 ? `장바구니, ${cartCount}개 상품` : "장바구니";

  return (
    <header className="mall-header">
      <div className="mall-header__inner">
        <Link to="/" className="mall-logo">
          VIBE
        </Link>

        <div className="mall-search-wrap" ref={searchRef}>
          <form className="mall-search" onSubmit={handleSearchSubmit}>
            <input
              className="mall-search__input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                if (query.trim() && suggestions.length > 0) {
                  setSearchOpen(true);
                }
              }}
              placeholder="상품을 검색해 보세요"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={searchOpen}
            />
            {query && (
              <button
                type="button"
                className="mall-search__clear"
                aria-label="검색어 지우기"
                onClick={() => {
                  setQuery("");
                  setSuggestions([]);
                  setSearchOpen(false);
                }}
              >
                ×
              </button>
            )}
            <button
              type="submit"
              className="mall-search__submit"
              aria-label="검색"
            >
              <span className="mall-search__icon" aria-hidden="true" />
            </button>
          </form>

          {searchOpen && query.trim() && (
            <div className="mall-search__dropdown" role="listbox">
              {searchLoading && (
                <p className="mall-search__empty">검색 중...</p>
              )}
              {!searchLoading && suggestions.length === 0 && (
                <p className="mall-search__empty">관련 상품이 없습니다</p>
              )}
              {!searchLoading &&
                suggestions.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    className="mall-search__item"
                    role="option"
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery(item.name || "");
                      navigate(`/products/${item._id}`);
                    }}
                  >
                    <img
                      src={item.image}
                      alt=""
                      className="mall-search__thumb"
                    />
                    <span className="mall-search__meta">
                      <strong>{item.name}</strong>
                      <em>
                        {item.category} · {formatPrice(item.price)}
                      </em>
                    </span>
                  </button>
                ))}
              {!searchLoading && suggestions.length > 0 && (
                <button
                  type="button"
                  className="mall-search__more"
                  onClick={() => goSearchPage()}
                >
                  '{query.trim()}' 전체 검색 결과 보기
                </button>
              )}
            </div>
          )}
        </div>

        <nav className="mall-header__nav">
          {isAdmin && (
            <Link to="/admin" className="mall-header__admin">
              어드민
            </Link>
          )}

          <Link
            to={user ? "/cart" : "/login"}
            className="mall-header__cart"
            aria-label={cartLabel}
            title={cartLabel}
          >
            <CartIcon />
            {cartCount > 0 && (
              <span className="mall-header__cart-count">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className={`user-menu__trigger${menuOpen ? " is-open" : ""}`}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <span>{user.name}님 환영합니다</span>
                <span className="user-menu__caret" aria-hidden />
              </button>

              {menuOpen && (
                <div className="user-menu__dropdown" role="menu">
                  <Link
                    to="/orders"
                    className="user-menu__item"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                  >
                    주문 내역
                  </Link>
                  <button
                    type="button"
                    className="user-menu__item"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="mall-header__login">
              로그인
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default memo(HomeHeader);
