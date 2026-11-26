import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMe } from "../api/auth";
import { addCartItem } from "../api/cart";
import { getProductById } from "../api/products";
import HomeFooter from "../components/HomeFooter";
import HomeHeader from "../components/HomeHeader";
import {
  clearAuthStorage,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";
import { notifyCartUpdated } from "../utils/cartEvents";
import {
  getProductColorNames,
  getSizesForColor,
  getVariantStock,
} from "../utils/productColors";

const DETAIL_TABS = ["정보", "사이즈", "추천", "후기", "문의"];

function formatPrice(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function HeartIcon() {
  return (
    <svg
      className="pd-like__icon"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("정보");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [liked, setLiked] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

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
    let cancelled = false;

    setLoading(true);
    setError("");

    getProductById(id)
      .then((data) => {
        if (cancelled) return;
        setProduct(data);
        setSize("");
        setColor("");
        setActiveImage(0);
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
  }, [id]);

  const handleLogout = () => {
    clearAuthStorage();
    setUser(null);
  };

  const productColors = getProductColorNames(product);
  const productSizes = getSizesForColor(product, color);
  const selectedSizeStock =
    size && product
      ? getVariantStock(product, size, color)
      : null;
  const galleryImages =
    Array.isArray(product?.images) && product.images.length > 0
      ? product.images
      : product?.image
        ? [product.image]
        : [];
  const currentImage =
    galleryImages[Math.min(activeImage, Math.max(galleryImages.length - 1, 0))] ||
    "";

  const handleBuy = async () => {
    if (!localStorage.getItem("token")) {
      window.alert("로그인 후 이용해 주세요.");
      navigate("/login");
      return;
    }
    if (product?.status === "판매중지" || Number(product?.stock) <= 0) {
      window.alert("현재 구매할 수 없는 상품입니다.");
      return;
    }
    if (productColors.length > 0 && !color) {
      window.alert("색상을 선택해 주세요.");
      return;
    }
    if (productSizes.length > 0 && !size) {
      window.alert("사이즈를 선택해 주세요.");
      return;
    }
    if (selectedSizeStock !== null && selectedSizeStock <= 0) {
      window.alert(
        productColors.length > 0
          ? "선택한 색상/사이즈는 재고가 없습니다."
          : "선택한 사이즈는 재고가 없습니다."
      );
      return;
    }

    setBuyLoading(true);
    try {
      const result = await addCartItem({
        productId: product._id,
        size,
        color,
        quantity: 1,
      });
      notifyCartUpdated();

      const cartItems = result.cart?.items || [];
      const normalizedSize = String(size).trim().toUpperCase();
      const normalizedColor = String(color || "").trim();
      const matched = cartItems.find((item) => {
        const productId = item.product?._id || item.product;
        return (
          String(productId) === String(product._id) &&
          String(item.size || "").toUpperCase() === normalizedSize &&
          (item.color || "") === normalizedColor
        );
      });

      if (!matched?._id) {
        window.alert(
          "주문 상품을 준비하지 못했습니다. 장바구니에서 다시 시도해 주세요."
        );
        navigate("/cart");
        return;
      }

      const ids = [String(matched._id)];
      sessionStorage.setItem("checkoutItemIds", JSON.stringify(ids));
      navigate("/checkout", { state: { cartItemIds: ids } });
    } catch (err) {
      window.alert(err.message || "구매 진행에 실패했습니다.");
    } finally {
      setBuyLoading(false);
    }
  };

  const handleCart = async () => {
    if (!localStorage.getItem("token")) {
      window.alert("로그인 후 이용해 주세요.");
      navigate("/login");
      return;
    }
    if (product?.status === "판매중지" || Number(product?.stock) <= 0) {
      window.alert("현재 담을 수 없는 상품입니다.");
      return;
    }
    if (productColors.length > 0 && !color) {
      window.alert("색상을 선택해 주세요.");
      return;
    }
    if (productSizes.length > 0 && !size) {
      window.alert("사이즈를 선택해 주세요.");
      return;
    }
    if (selectedSizeStock !== null && selectedSizeStock <= 0) {
      window.alert(
        productColors.length > 0
          ? "선택한 색상/사이즈는 재고가 없습니다."
          : "선택한 사이즈는 재고가 없습니다."
      );
      return;
    }

    setCartLoading(true);
    try {
      await addCartItem({
        productId: product._id,
        size,
        color,
        quantity: 1,
      });
      notifyCartUpdated();
      const goCart = window.confirm(
        "장바구니에 담았습니다. 장바구니로 이동할까요?"
      );
      if (goCart) navigate("/cart");
    } catch (err) {
      window.alert(err.message || "장바구니 담기에 실패했습니다.");
    } finally {
      setCartLoading(false);
    }
  };

  const isUnavailable =
    product?.status === "판매중지" || Number(product?.stock) <= 0;

  return (
    <div className="mall">
      <HomeHeader user={user} onLogout={handleLogout} />

      <main className="pd">
        {loading && <p className="pd-status">상품 불러오는 중...</p>}
        {error && (
          <div className="pd-status pd-status--error">
            <p>{error}</p>
            <button
              type="button"
              className="pd-btn pd-btn--ghost"
              onClick={() => navigate("/")}
            >
              홈으로
            </button>
          </div>
        )}

        {!loading && !error && product && (
          <>
            <section className="pd-top">
              <div className="pd-gallery">
                <div className="pd-thumbs" aria-label="상품 썸네일">
                  {galleryImages.map((url, index) => (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      className={`pd-thumb${
                        activeImage === index ? " is-active" : ""
                      }`}
                      onClick={() => setActiveImage(index)}
                    >
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
                <div className="pd-main-image">
                  <img src={currentImage} alt={product.name} />
                  <span className="pd-image-count">
                    {Math.min(activeImage + 1, galleryImages.length)}/
                    {galleryImages.length || 1}
                  </span>
                </div>
              </div>

              <aside className="pd-buy">
                <div className="pd-brand-row">
                  <div className="pd-brand">
                    <span className="pd-brand__mark">
                      {(product.category || "V").slice(0, 1)}
                    </span>
                    <div>
                      <p className="pd-brand__name">{product.category}</p>
                      <Link to="/" className="pd-brand__link">
                        브랜드홈
                      </Link>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`pd-like${liked ? " is-on" : ""}`}
                    onClick={() => setLiked((prev) => !prev)}
                    aria-label="좋아요"
                  >
                    <HeartIcon />
                    {liked ? "1" : "0"}
                  </button>
                </div>

                <h1 className="pd-title">{product.name}</h1>

                <div className="pd-price-block">
                  <p className="pd-price">{formatPrice(product.price)}</p>
                  {isUnavailable && (
                    <span className="pd-badge">판매중지</span>
                  )}
                </div>

                <div className="pd-meta-row">
                  <span>
                    총 재고 {product.stock ?? 0}개
                    {color && size
                      ? ` · ${color} / ${size} ${selectedSizeStock ?? 0}개`
                      : size
                        ? ` · ${size} ${selectedSizeStock ?? 0}개`
                        : ""}
                  </span>
                  <span>SKU {product.sku}</span>
                </div>

                <div className="pd-delivery">
                  <span className="pd-delivery__icon" aria-hidden />
                  <p>
                    <strong>내일 도착 예정</strong>
                    <span> 16시까지 결제 시</span>
                  </p>
                </div>

                <div className="pd-options">
                  {productColors.length > 0 && (
                    <div className="pd-option-block">
                      <p className="pd-select__label">색상</p>
                      <div className="pd-color-list">
                        {productColors.map((item) => (
                          <button
                            key={item}
                            type="button"
                            className={`pd-color-chip${
                              color === item ? " is-selected" : ""
                            }`}
                            onClick={() => {
                              setColor(item);
                              setSize("");
                            }}
                            disabled={isUnavailable}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {productSizes.length > 0 && (
                    <label className="pd-select">
                      <span className="pd-select__label">사이즈</span>
                      <select
                        value={size}
                        onChange={(event) => setSize(event.target.value)}
                        disabled={isUnavailable}
                      >
                        <option value="">사이즈를 선택해주세요</option>
                        {productSizes.map((option) => (
                          <option
                            key={option.size}
                            value={option.size}
                            disabled={option.stock <= 0}
                          >
                            {option.size}
                            {option.stock <= 0
                              ? " (품절)"
                              : ` · 재고 ${option.stock}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="pd-actions">
                  <button
                    type="button"
                    className={`pd-heart${liked ? " is-on" : ""}`}
                    onClick={() => setLiked((prev) => !prev)}
                    aria-label="찜하기"
                  >
                    <HeartIcon />
                  </button>
                  <button
                    type="button"
                    className="pd-btn pd-btn--ghost"
                    onClick={handleCart}
                    disabled={isUnavailable || cartLoading}
                  >
                    {cartLoading ? "담는 중..." : "장바구니"}
                  </button>
                  <button
                    type="button"
                    className="pd-btn pd-btn--solid"
                    onClick={handleBuy}
                    disabled={isUnavailable || buyLoading || cartLoading}
                  >
                    {buyLoading ? "이동 중..." : "구매하기"}
                  </button>
                </div>

                <ul className="pd-benefits">
                  <li>무이자 할부 · 카드사별 혜택 확인</li>
                  <li>카카오페이 / 네이버페이 결제 가능</li>
                  <li>30일 이내 교환·반품 안내</li>
                </ul>
              </aside>
            </section>

            <section className="pd-info">
              <div className="pd-tabs" role="tablist">
                {DETAIL_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={`pd-tab${activeTab === tab ? " is-active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="pd-panel">
                {activeTab === "정보" && (
                  <>
                    <table className="pd-spec">
                      <tbody>
                        <tr>
                          <th>품번</th>
                          <td>{product.sku}</td>
                          <th>카테고리</th>
                          <td>{product.category}</td>
                        </tr>
                        <tr>
                          <th>상태</th>
                          <td>{product.status || "판매중"}</td>
                          <th>재고</th>
                          <td>{product.stock ?? 0}개</td>
                        </tr>
                        <tr>
                          <th>사이즈</th>
                          <td>
                            {productSizes.length > 0
                              ? productSizes
                                  .map(
                                    (item) => `${item.size}(${item.stock})`
                                  )
                                  .join(", ")
                              : "-"}
                          </td>
                          <th>색상</th>
                          <td>
                            {productColors.length > 0
                              ? productColors.join(", ")
                              : "-"}
                          </td>
                        </tr>
                        <tr>
                          <th>가격</th>
                          <td colSpan={3}>{formatPrice(product.price)}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="pd-desc">
                      <h2>상품 설명</h2>
                      <p>
                        {product.description?.trim()
                          ? product.description
                          : "등록된 상품 설명이 없습니다."}
                      </p>
                    </div>
                    <div className="pd-desc-image">
                      <img src={product.image} alt={product.name} />
                    </div>
                  </>
                )}

                {activeTab !== "정보" && (
                  <p className="pd-empty">
                    {activeTab} 내용은 준비 중입니다.
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}

export default ProductDetail;
