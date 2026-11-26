import { useEffect, useMemo, useState } from "react";
import { getMe } from "../api/auth";
import { getAllProducts, getBestsellers } from "../api/products";
import HomeBanners from "../components/HomeBanners";
import HomeCategories from "../components/HomeCategories";
import HomeFooter from "../components/HomeFooter";
import HomeHeader from "../components/HomeHeader";
import ProductSection from "../components/ProductSection";
import {
  clearAuthStorage,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";

// 데스크탑 4열 × 3줄
const WEEKLY_BEST_LIMIT = 12;

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

function Home() {
  const [user, setUser] = useState(() => getStoredUser());
  const [products, setProducts] = useState([]);
  const [bestProducts, setBestProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  // 토큰이 있으면 최신 유저 정보 조회 (언마운트 시 요청 정리)
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

  // 메인: 신상품 + 주간 베스트
  useEffect(() => {
    let cancelled = false;

    setProductsLoading(true);
    setProductsError("");

    Promise.all([
      getAllProducts(),
      getBestsellers({ limit: WEEKLY_BEST_LIMIT, days: 7 }),
    ])
      .then(([allData, bestData]) => {
        if (cancelled) return;
        const list = Array.isArray(allData?.products) ? allData.products : [];
        const bestList = Array.isArray(bestData?.products)
          ? bestData.products
          : [];
        setProducts(list.map(formatProduct));
        setBestProducts(bestList.map(formatProduct));
      })
      .catch((err) => {
        if (cancelled) return;
        setProductsError(err.message || "상품을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    clearAuthStorage();
    setUser(null);
  };

  // 판매중 상품만 신상품에 노출
  const newProducts = useMemo(
    () =>
      products
        .filter((item) => item.status === "판매중")
        .slice(0, 8),
    [products]
  );

  return (
    <div className="mall">
      <HomeHeader user={user} onLogout={handleLogout} />

      <main className="home-main">
        <HomeBanners />
        <HomeCategories />

        {productsLoading && (
          <p className="home-section home-products-status">상품 불러오는 중...</p>
        )}
        {productsError && (
          <p className="home-section home-products-status home-products-status--error">
            {productsError}
          </p>
        )}

        {!productsLoading && !productsError && (
          <>
            <ProductSection
              title="주간 베스트"
              description="지금 가장 인기 있는 아이템"
              products={bestProducts}
              gridClassName="home-products--best"
            />
            <ProductSection
              title="신상품"
              description="새롭게 업데이트된 룩"
              products={newProducts}
              last
            />
          </>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

export default Home;
