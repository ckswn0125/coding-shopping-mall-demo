import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getMe } from "../api/auth";
import { searchProducts } from "../api/products";
import HomeFooter from "../components/HomeFooter";
import HomeHeader from "../components/HomeHeader";
import ProductCard from "../components/ProductCard";
import {
  clearAuthStorage,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";

function formatProduct(product) {
  return {
    id: product._id,
    brand: product.category || "",
    name: product.name,
    price: Number(product.price).toLocaleString("ko-KR"),
    image: product.image,
    status: product.status || "판매중",
    stock: product.stock ?? 0,
  };
}

function Search() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") || "").trim();

  const [user, setUser] = useState(() => getStoredUser());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }

    getMe()
      .then((result) => {
        setUser(result.user);
        saveUser(result.user);
      })
      .catch(() => {
        clearAuthStorage();
        setUser(null);
      });
  }, []);

  useEffect(() => {
    if (!q) {
      setProducts([]);
      setLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    searchProducts(q, { limit: 48 })
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.products) ? data.products : [];
        setProducts(
          list
            .filter((item) => item.status !== "판매중지")
            .map(formatProduct)
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "검색에 실패했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [q]);

  const handleLogout = () => {
    clearAuthStorage();
    setUser(null);
  };

  return (
    <div className="mall">
      <HomeHeader user={user} onLogout={handleLogout} />

      <main className="category-page">
        <h1 className="order-page__title">
          {q ? `'${q}' 검색 결과` : "상품 검색"}
        </h1>

        {!q && (
          <div className="cart-empty">
            <p>검색어를 입력해 주세요.</p>
            <Link to="/" className="cart-btn cart-btn--solid">
              홈으로
            </Link>
          </div>
        )}

        {q && loading && (
          <p className="home-products-status">검색 중...</p>
        )}
        {q && error && (
          <p className="home-products-status home-products-status--error">
            {error}
          </p>
        )}

        {q && !loading && !error && (
          <>
            <p className="category-count">총 {products.length}개</p>
            {products.length === 0 ? (
              <div className="cart-empty">
                <p>관련 상품이 없습니다.</p>
                <button
                  type="button"
                  className="cart-btn cart-btn--ghost"
                  onClick={() => navigate("/")}
                >
                  홈으로
                </button>
              </div>
            ) : (
              <div className="home-products">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

export default Search;
