import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../api/auth";
import { createProduct } from "../api/products";
import {
  clearAuthStorage,
  getStoredUser,
  saveUser,
} from "../utils/authStorage";
import { openCloudinaryWidget } from "../utils/cloudinary";

// Product.js 스키마와 동일한 카테고리/사이즈
const CATEGORIES = ["아우터", "상의", "하의", "신발", "악세사리"];
const COLLECTIONS = ["시즌오프닝", "주간베스트", "회원특가"];
const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "FREE"];
const SHOE_SIZES = Array.from({ length: 21 }, (_, i) => String(200 + i * 5));

function getSizeOptions(category) {
  return category === "신발" ? SHOE_SIZES : CLOTHING_SIZES;
}

const initialForm = {
  sku: "",
  name: "",
  price: "",
  category: "상의",
  images: [],
  description: "",
  sizeStocks: {}, // 색상 없을 때: { S: "10" }
  colors: [],
  colorSizeStocks: {}, // 색상별: { Black: { S: "3" } }
  collections: [],
};

function ProductCreate() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(() => getStoredUser());
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [colorInput, setColorInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 관리자만 접근 가능
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

  const sizeOptions = getSizeOptions(form.category);

  const selectedSizes = Object.keys(form.sizeStocks);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      if (name === "category" && value !== prev.category) {
        return {
          ...prev,
          category: value,
          sizeStocks: {},
          colorSizeStocks: {},
        };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleToggleSize = (size) => {
    setForm((prev) => {
      const nextSizeStocks = { ...prev.sizeStocks };
      const nextColorSizeStocks = { ...prev.colorSizeStocks };
      const removing = Object.prototype.hasOwnProperty.call(nextSizeStocks, size);

      if (removing) {
        delete nextSizeStocks[size];
        for (const color of Object.keys(nextColorSizeStocks)) {
          const row = { ...nextColorSizeStocks[color] };
          delete row[size];
          nextColorSizeStocks[color] = row;
        }
      } else {
        nextSizeStocks[size] = "0";
        for (const color of Object.keys(nextColorSizeStocks)) {
          nextColorSizeStocks[color] = {
            ...nextColorSizeStocks[color],
            [size]: "0",
          };
        }
      }

      return {
        ...prev,
        sizeStocks: nextSizeStocks,
        colorSizeStocks: nextColorSizeStocks,
      };
    });
  };

  const handleSizeStockChange = (size, value) => {
    setForm((prev) => ({
      ...prev,
      sizeStocks: {
        ...prev.sizeStocks,
        [size]: value,
      },
    }));
  };

  const handleColorSizeStockChange = (color, size, value) => {
    setForm((prev) => ({
      ...prev,
      colorSizeStocks: {
        ...prev.colorSizeStocks,
        [color]: {
          ...(prev.colorSizeStocks[color] || {}),
          [size]: value,
        },
      },
    }));
  };

  const handleAddColor = () => {
    const next = colorInput.trim();
    if (!next) return;
    if (form.colors.includes(next)) {
      setError("이미 추가된 컬러입니다.");
      return;
    }
    const sizeRow = {};
    for (const size of Object.keys(form.sizeStocks)) {
      sizeRow[size] = "0";
    }
    setForm((prev) => ({
      ...prev,
      colors: [...prev.colors, next],
      colorSizeStocks: {
        ...prev.colorSizeStocks,
        [next]: sizeRow,
      },
    }));
    setColorInput("");
    setError("");
  };

  const handleRemoveColor = (color) => {
    setForm((prev) => {
      const nextColorSizeStocks = { ...prev.colorSizeStocks };
      delete nextColorSizeStocks[color];
      return {
        ...prev,
        colors: prev.colors.filter((item) => item !== color),
        colorSizeStocks: nextColorSizeStocks,
      };
    });
  };

  const handleToggleCollection = (collection) => {
    setForm((prev) => {
      const exists = prev.collections.includes(collection);
      return {
        ...prev,
        collections: exists
          ? prev.collections.filter((item) => item !== collection)
          : [...prev.collections, collection],
      };
    });
  };

  // Cloudinary 위젯으로 이미지 여러 장 업로드
  const handleUploadImage = async () => {
    setError("");
    setUploading(true);

    try {
      const urls = await openCloudinaryWidget({ multiple: true, maxFiles: 10 });
      const next = Array.isArray(urls) ? urls : [urls];
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...next.filter(Boolean)],
      }));
    } catch (err) {
      if (err?.message !== "UPLOAD_CANCELLED") {
        setError(err.message || "이미지 업로드에 실패했습니다.");
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (url) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((item) => item !== url),
    }));
  };

  const handleMoveImage = (index, direction) => {
    setForm((prev) => {
      const next = [...prev.images];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return { ...prev, images: next };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // 필수값 검사 (description 제외)
    if (
      !form.sku.trim() ||
      !form.name.trim() ||
      form.price === "" ||
      !form.category ||
      form.images.length === 0
    ) {
      setError("sku, 상품이름, 가격, 카테고리, 이미지는 필수입니다.");
      return;
    }

    if (Number(form.price) < 0 || Number.isNaN(Number(form.price))) {
      setError("가격은 0 이상의 숫자여야 합니다.");
      return;
    }

    if (selectedSizes.length === 0) {
      setError("사이즈를 하나 이상 선택해 주세요.");
      return;
    }

    let sizes;
    let colorsPayload = [];

    if (form.colors.length > 0) {
      for (const color of form.colors) {
        const row = form.colorSizeStocks[color] || {};
        for (const size of selectedSizes) {
          const stock = Number(row[size]);
          if (Number.isNaN(stock) || stock < 0) {
            setError(`${color} / ${size} 재고는 0 이상의 숫자여야 합니다.`);
            return;
          }
        }
      }

      colorsPayload = form.colors.map((color) => ({
        color,
        sizes: selectedSizes.map((size) => ({
          size,
          stock: Number(form.colorSizeStocks[color]?.[size] || 0),
        })),
      }));

      const sizeTotals = {};
      for (const colorEntry of colorsPayload) {
        for (const item of colorEntry.sizes) {
          sizeTotals[item.size] =
            (sizeTotals[item.size] || 0) + Number(item.stock);
        }
      }
      sizes = selectedSizes.map((size) => ({
        size,
        stock: sizeTotals[size] || 0,
      }));
    } else {
      for (const size of selectedSizes) {
        const stock = Number(form.sizeStocks[size]);
        if (Number.isNaN(stock) || stock < 0) {
          setError(`${size} 재고는 0 이상의 숫자여야 합니다.`);
          return;
        }
      }
      sizes = selectedSizes.map((size) => ({
        size,
        stock: Number(form.sizeStocks[size]),
      }));
    }

    const totalStock = sizes.reduce((sum, item) => sum + item.stock, 0);

    setLoading(true);

    try {
      await createProduct({
        sku: form.sku.trim(),
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category,
        status: totalStock === 0 ? "판매중지" : "판매중",
        image: form.images[0],
        images: form.images,
        description: form.description.trim(),
        sizes,
        colors: colorsPayload,
        collections: form.collections,
      });

      window.alert("상품이 등록되었습니다.");
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "상품 등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return null;
  }

  return (
    <div className="admin-shell admin-shell--single">
      <div className="admin-content">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar__eyebrow">PRODUCT CREATE</p>
            <h1 className="admin-topbar__title">새 상품 등록</h1>
          </div>
          <div className="admin-topbar__actions">
            <span className="admin-topbar__hello">{admin?.name}님</span>
            <Link to="/admin" className="admin-btn admin-btn--ghost">
              관리자로 돌아가기
            </Link>
          </div>
        </header>

        <section className="admin-card product-create-card">
          <p className="admin-card__desc">
            이미지는 Cloudinary 위젯으로 업로드합니다. sku는 고유해야 하며,
            설명만 선택 입력입니다.
          </p>

          <form className="product-create-form" onSubmit={handleSubmit} noValidate>
            <label className="product-field">
              <span className="product-field__label">
                SKU <em>*</em>
              </span>
              <input
                name="sku"
                value={form.sku}
                onChange={handleChange}
                placeholder="예: TOP-001"
                required
              />
            </label>

            <label className="product-field">
              <span className="product-field__label">
                상품 이름 <em>*</em>
              </span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="예: 오버핏 코튼 셔츠"
                required
              />
            </label>

            <label className="product-field">
              <span className="product-field__label">
                상품 가격 <em>*</em>
              </span>
              <input
                name="price"
                type="number"
                min="0"
                value={form.price}
                onChange={handleChange}
                placeholder="예: 39000"
                required
              />
            </label>

            <label className="product-field">
              <span className="product-field__label">
                카테고리 <em>*</em>
              </span>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <div className="product-field product-field--full">
              <span className="product-field__label">홈 배너 컬렉션</span>
              <div className="option-chips">
                {COLLECTIONS.map((collection) => {
                  const selected = form.collections.includes(collection);
                  return (
                    <button
                      key={collection}
                      type="button"
                      className={`option-chip${selected ? " is-selected" : ""}`}
                      onClick={() => handleToggleCollection(collection)}
                    >
                      {collection}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="product-field product-field--full">
              <span className="product-field__label">
                사이즈 / 재고 <em>*</em>
                {form.category === "신발" ? (
                  <small> (신발: 200~300, 5단위)</small>
                ) : null}
              </span>
              <div className="option-chips">
                {sizeOptions.map((size) => {
                  const selected = Object.prototype.hasOwnProperty.call(
                    form.sizeStocks,
                    size
                  );
                  return (
                    <button
                      key={size}
                      type="button"
                      className={`option-chip${selected ? " is-selected" : ""}`}
                      onClick={() => handleToggleSize(size)}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {form.colors.length === 0 && selectedSizes.length > 0 && (
                <div className="size-stock-grid">
                  {selectedSizes.map((size) => (
                    <label key={size} className="size-stock-item">
                      <span>{size}</span>
                      <input
                        type="number"
                        min="0"
                        value={form.sizeStocks[size]}
                        onChange={(event) =>
                          handleSizeStockChange(size, event.target.value)
                        }
                        placeholder="재고"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="product-field product-field--full">
              <span className="product-field__label">
                컬러 (직접 추가)
                <small> — 색상을 추가하면 색상마다 사이즈 재고를 입력합니다</small>
              </span>
              <div className="color-add">
                <input
                  value={colorInput}
                  onChange={(event) => setColorInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddColor();
                    }
                  }}
                  placeholder="예: Light Grey"
                />
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={handleAddColor}
                >
                  추가
                </button>
              </div>
              {form.colors.length > 0 && (
                <div className="option-chips">
                  {form.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className="option-chip is-selected"
                      onClick={() => handleRemoveColor(color)}
                      title="클릭하면 삭제"
                    >
                      {color} ×
                    </button>
                  ))}
                </div>
              )}
              {form.colors.length > 0 && selectedSizes.length > 0 && (
                <div className="color-stock-list">
                  {form.colors.map((color) => (
                    <div key={color} className="color-stock-block">
                      <p className="color-stock-block__title">{color}</p>
                      <div className="size-stock-grid">
                        {selectedSizes.map((size) => (
                          <label key={`${color}-${size}`} className="size-stock-item">
                            <span>{size}</span>
                            <input
                              type="number"
                              min="0"
                              value={form.colorSizeStocks[color]?.[size] ?? "0"}
                              onChange={(event) =>
                                handleColorSizeStockChange(
                                  color,
                                  size,
                                  event.target.value
                                )
                              }
                              placeholder="재고"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="product-field product-field--full">
              <span className="product-field__label">
                상품 이미지 <em>*</em>
                <small> — 여러 장 가능, 첫 장이 대표 이미지</small>
              </span>

              <div className="product-upload">
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={handleUploadImage}
                  disabled={uploading || loading}
                >
                  {uploading
                    ? "위젯 여는 중..."
                    : form.images.length > 0
                      ? "이미지 추가 업로드"
                      : "Cloudinary로 이미지 업로드"}
                </button>
              </div>

              {form.images.length > 0 ? (
                <div className="product-images-grid">
                  {form.images.map((url, index) => (
                    <div key={`${url}-${index}`} className="product-image-card">
                      {index === 0 && (
                        <span className="product-image-card__badge">대표</span>
                      )}
                      <img src={url} alt={`상품 이미지 ${index + 1}`} />
                      <div className="product-image-card__actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          onClick={() => handleMoveImage(index, -1)}
                          disabled={index === 0}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          onClick={() => handleMoveImage(index, 1)}
                          disabled={index === form.images.length - 1}
                        >
                          →
                        </button>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost"
                          onClick={() => handleRemoveImage(url)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="product-upload__hint">
                  업로드하면 여기에 미리보기가 표시됩니다.
                </p>
              )}
            </div>

            <label className="product-field product-field--full">
              <span className="product-field__label">설명 (선택)</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="상품 설명을 입력해 주세요"
                rows={4}
              />
            </label>

            {error && <p className="admin-error product-field--full">{error}</p>}

            <div className="product-create-actions product-field--full">
              <button
                type="button"
                className="admin-btn admin-btn--ghost"
                onClick={() => navigate("/admin")}
              >
                취소
              </button>
              <button
                type="submit"
                className="admin-btn admin-btn--primary"
                disabled={loading || uploading}
              >
                {loading ? "등록 중..." : "상품 등록하기"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

export default ProductCreate;
