import { apiFetch } from "./client";

// 상품 전체 조회 (페이지네이션: 기본 page=1, limit=10)
export function getProducts({ page = 1, limit = 10, category, q } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (category) params.set("category", category);
  if (q) params.set("q", q);

  return apiFetch(`/api/products?${params.toString()}`, {
    method: "GET",
  });
}

// 상품 검색 (자동완성/검색 결과)
export function searchProducts(q, { limit = 8 } = {}) {
  const params = new URLSearchParams({
    q: String(q || ""),
    page: "1",
    limit: String(limit),
  });

  return apiFetch(`/api/products?${params.toString()}`, {
    method: "GET",
  });
}

// 상품 전체 조회 (페이지네이션 없이 전부)
export function getAllProducts() {
  return apiFetch("/api/products?all=true", {
    method: "GET",
  });
}

// 카테고리별 상품 전체 조회
export function getProductsByCategory(category) {
  const params = new URLSearchParams({
    all: "true",
    category: String(category),
  });

  return apiFetch(`/api/products?${params.toString()}`, {
    method: "GET",
  });
}

// 배너 컬렉션별 상품 전체 조회
export function getProductsByCollection(collection) {
  const params = new URLSearchParams({
    all: "true",
    collection: String(collection),
  });

  return apiFetch(`/api/products?${params.toString()}`, {
    method: "GET",
  });
}

// 주간 베스트 (판매량순, 동점이면 랜덤)
export function getBestsellers({ limit = 12, days = 7 } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    days: String(days),
  });

  return apiFetch(`/api/products/bestsellers?${params.toString()}`, {
    method: "GET",
  });
}

// 상품 단건 조회
export function getProductById(id) {
  return apiFetch(`/api/products/${id}`, {
    method: "GET",
  });
}

// 상품 등록
export function createProduct(payload) {
  return apiFetch("/api/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// 상품 수정
export function updateProduct(id, payload) {
  return apiFetch(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

// 상품 삭제
export function deleteProduct(id) {
  return apiFetch(`/api/products/${id}`, {
    method: "DELETE",
  });
}
