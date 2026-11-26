// 상품 colors 필드 헬퍼
// - 구형: ["Black", "White"]
// - 신규: [{ color, sizes: [{ size, stock }] }]

export function getColorName(entry) {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return "";
  return String(entry.color || entry.name || "").trim();
}

export function getProductColorNames(product) {
  if (!Array.isArray(product?.colors)) return [];
  return product.colors.map(getColorName).filter(Boolean);
}

export function hasColorSizeStocks(product) {
  return (product?.colors || []).some(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      Array.isArray(entry.sizes) &&
      entry.sizes.length > 0
  );
}

export function getVariantStock(product, size, color = "") {
  if (hasColorSizeStocks(product)) {
    const colorEntry = (product.colors || []).find(
      (entry) => getColorName(entry) === String(color || "").trim()
    );
    if (!colorEntry) return 0;
    const found = (colorEntry.sizes || []).find((item) => item.size === size);
    return Number(found?.stock) || 0;
  }

  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  const found = sizes.find((item) =>
    typeof item === "string" ? item === size : item.size === size
  );
  if (!found) return 0;
  if (typeof found === "string") return Number(product?.stock) || 0;
  return Number(found.stock) || 0;
}

export function getSizesForColor(product, color = "") {
  if (hasColorSizeStocks(product) && color) {
    const colorEntry = (product.colors || []).find(
      (entry) => getColorName(entry) === String(color).trim()
    );
    if (colorEntry && Array.isArray(colorEntry.sizes)) {
      return colorEntry.sizes.map((item) => ({
        size: item.size,
        stock: Number(item.stock) || 0,
      }));
    }
    return [];
  }

  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  return sizes.map((item) =>
    typeof item === "string"
      ? { size: item, stock: 0 }
      : { size: item.size, stock: Number(item.stock) || 0 }
  );
}
