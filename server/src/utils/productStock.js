// 상품 재고 헬퍼 (사이즈 / 색상×사이즈)

function getColorName(entry) {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return "";
  return String(entry.color || entry.name || "").trim();
}

function hasColorSizeStocks(product) {
  return (product.colors || []).some(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      Array.isArray(entry.sizes) &&
      entry.sizes.length > 0
  );
}

function getColorNames(product) {
  return (product.colors || [])
    .map(getColorName)
    .filter((name) => name.length > 0);
}

function getSizeStock(product, size) {
  if (!Array.isArray(product.sizes)) return 0;
  const found = product.sizes.find((item) => {
    if (typeof item === "string") return item === size;
    return item.size === size;
  });
  if (!found) return 0;
  if (typeof found === "string") return Number(product.stock) || 0;
  return Number(found.stock) || 0;
}

// 색상+사이즈 재고 (색상 재고 구조가 없으면 사이즈 재고로 폴백)
function getVariantStock(product, size, color = "") {
  if (hasColorSizeStocks(product)) {
    const normalizedColor = String(color || "").trim();
    const colorEntry = (product.colors || []).find(
      (entry) => getColorName(entry) === normalizedColor
    );
    if (!colorEntry || !Array.isArray(colorEntry.sizes)) return 0;
    const found = colorEntry.sizes.find((item) => item.size === size);
    return Number(found?.stock) || 0;
  }
  return getSizeStock(product, size);
}

function rebuildSizeTotals(product) {
  if (!hasColorSizeStocks(product)) {
    product.stock = (product.sizes || []).reduce(
      (sum, entry) => sum + Number(entry.stock || 0),
      0
    );
    return product;
  }

  const sizeMap = new Map();
  for (const colorEntry of product.colors) {
    if (!colorEntry || !Array.isArray(colorEntry.sizes)) continue;
    for (const item of colorEntry.sizes) {
      const size = item.size;
      const stock = Number(item.stock) || 0;
      sizeMap.set(size, (sizeMap.get(size) || 0) + stock);
    }
  }

  product.sizes = [...sizeMap.entries()].map(([size, stock]) => ({
    size,
    stock,
  }));
  product.stock = [...sizeMap.values()].reduce((sum, n) => sum + n, 0);
  return product;
}

function deductVariantStock(product, size, color, quantity) {
  const qty = Number(quantity) || 0;
  if (qty <= 0) return product;

  if (hasColorSizeStocks(product)) {
    const normalizedColor = String(color || "").trim();
    const colorEntry = (product.colors || []).find(
      (entry) => getColorName(entry) === normalizedColor
    );
    if (!colorEntry || !Array.isArray(colorEntry.sizes)) {
      throw new Error("색상 재고 정보를 찾을 수 없습니다.");
    }
    colorEntry.sizes = colorEntry.sizes.map((item) => {
      if (item.size !== size) return item;
      return {
        size: item.size,
        stock: Math.max(0, Number(item.stock) - qty),
      };
    });
    product.markModified("colors");
    rebuildSizeTotals(product);
    return product;
  }

  if (Array.isArray(product.sizes)) {
    product.sizes = product.sizes.map((entry) => {
      if (typeof entry === "string") {
        return entry === size
          ? {
              size: entry,
              stock: Math.max(0, getSizeStock(product, size) - qty),
            }
          : { size: entry, stock: 0 };
      }
      if (entry.size === size) {
        return {
          size: entry.size,
          stock: Math.max(0, Number(entry.stock) - qty),
        };
      }
      return entry;
    });
  }
  product.stock = (product.sizes || []).reduce(
    (sum, entry) => sum + Number(entry.stock || 0),
    0
  );
  return product;
}

module.exports = {
  getColorName,
  getColorNames,
  hasColorSizeStocks,
  getSizeStock,
  getVariantStock,
  rebuildSizeTotals,
  deductVariantStock,
};
