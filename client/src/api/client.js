// API 기본 주소 (.env 의 VITE_API_BASE_URL, 없으면 localhost:5000)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// 공통 fetch 헬퍼: JSON 요청/응답 처리 + 에러 메시지 throw
// auth: true 이면 localStorage 의 token 을 Authorization 헤더에 포함
export async function apiFetch(path, options = {}) {
  const { headers, auth = false, ...rest } = options;

  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (auth) {
    const token = localStorage.getItem("token");
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
  });

  const data = await response.json().catch(() => ({}));

  // 4xx/5xx 이면 Error 로 던져서 화면에서 catch 할 수 있게 함
  if (!response.ok) {
    const error = new Error(
      data.message || `Request failed: ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
