import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMe } from "../api/auth";
import { getProductsByCategory } from "../api/products";
import HomeFooter from "../components/HomeFooter";
import HomeHeader from "../components/HomeHeader";
import ProductCard from "../components/ProductCard";
import { CATEGORIES } from "../data/home";
import {
  clearAuthStorage,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";

const VALID_CATEGORIES = CATEGORIES.map((item) => item.name);

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

function Category() {
  const { category: rawCategory } = useParams();
  const navigate = useNavigate();
  const category = decodeURIComponent(rawCategory || "");

  const [user, setUser] = useState(() => getStoredUser());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const categoryMeta = useMemo(
    () => CATEGORIES.find((item) => item.name === category) || null,
    [category]
  );

  useEffect(() => {
    if (!VALID_CATEGORIES.includes(category)) {
      navigate("/", { replace: true });
    }
  }, [category, navigate]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      return;
    }

    const controller = new AbortController();

    getMe()
      .then((result) => {
        if (controller.signal.aborted) return;
        setUser(result.user);
        saveUser(result.user);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        clearAuthStorage();
        setUser(null);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!VALID_CATEGORIES.includes(category)) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    getProductsByCategory(category)
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
        setError(err.message || "상품을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  const handleLogout = () => {
    clearAuthStorage();
    setUser(null);
  };

  if (!VALID_CATEGORIES.includes(category)) {
    return null;
  }

  return (
    <div className="mall">
      <HomeHeader user={user} onLogout={handleLogout} />

      <main className="category-page">
        <section
          className="category-hero"
          style={
            categoryMeta?.image
              ? { backgroundImage: `url(${categoryMeta.image})` }
              : undefined
          }
        >
          <div className="category-hero__overlay">
            <p className="category-hero__eyebrow">CATEGORY</p>
            <h1 className="category-hero__title">{category}</h1>
            <p className="category-hero__desc">
              {category} 카테고리 상품만 모아봤습니다.
            </p>
          </div>
        </section>

        <div className="category-tabs" aria-label="카테고리 바로가기">
          {CATEGORIES.map((item) => (
            <Link
              key={item.name}
              to={`/category/${encodeURIComponent(item.name)}`}
              className={`category-tabs__chip${
                item.name === category ? " is-active" : ""
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {loading && <p className="home-products-status">상품 불러오는 중...</p>}
        {error && (
          <p className="home-products-status home-products-status--error">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <p className="category-count">총 {products.length}개</p>
            {products.length === 0 ? (
              <div className="cart-empty">
                <p>이 카테고리에 등록된 상품이 없습니다.</p>
                <Link to="/" className="cart-btn cart-btn--solid">
                  홈으로
                </Link>
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

export default Category;
