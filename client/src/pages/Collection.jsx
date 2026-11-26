import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMe } from "../api/auth";
import { getProductsByCollection } from "../api/products";
import HomeFooter from "../components/HomeFooter";
import HomeHeader from "../components/HomeHeader";
import ProductCard from "../components/ProductCard";
import { BANNERS } from "../data/home";
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

function Collection() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const banner = useMemo(
    () => BANNERS.find((item) => item.slug === slug) || null,
    [slug]
  );

  const [user, setUser] = useState(() => getStoredUser());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!banner) {
      navigate("/", { replace: true });
    }
  }, [banner, navigate]);

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
    if (!banner) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    getProductsByCollection(banner.collection)
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
  }, [banner]);

  const handleLogout = () => {
    clearAuthStorage();
    setUser(null);
  };

  if (!banner) return null;

  return (
    <div className="mall">
      <HomeHeader user={user} onLogout={handleLogout} />

      <main className="category-page">
        <section
          className="category-hero"
          style={{ backgroundImage: `url(${banner.image})` }}
        >
          <div className="category-hero__overlay">
            <p className="category-hero__eyebrow">VIBE MALL</p>
            <h1 className="category-hero__title">{banner.title}</h1>
            <p className="category-hero__desc">{banner.text}</p>
          </div>
        </section>

        <div className="category-tabs" aria-label="컬렉션 바로가기">
          {BANNERS.map((item) => (
            <Link
              key={item.slug}
              to={`/collection/${item.slug}`}
              className={`category-tabs__chip${
                item.slug === slug ? " is-active" : ""
              }`}
            >
              {item.text}
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
                <p>
                  아직 이 컬렉션에 등록된 상품이 없습니다.
                  <br />
                  관리자에서 상품 수정 시 컬렉션을 선택해 주세요.
                </p>
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

export default Collection;
