import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMe, loginUser } from "../api/auth";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 로그인 페이지
function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // 이미 로그인된 유저인지 확인 중인지
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 토큰이 있고 유저 정보를 가져올 수 있으면 메인으로 이동
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setCheckingAuth(false);
      return;
    }

    getMe()
      .then((result) => {
        localStorage.setItem("user", JSON.stringify(result.user));
        navigate("/", { replace: true });
      })
      .catch(() => {
        // 토큰이 유효하지 않으면 정리 후 로그인 폼 표시
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setCheckingAuth(false);
      });
  }, [navigate]);

  // 이메일/비밀번호 입력 변경
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 로그인 버튼 클릭 시 실행
  const handleSubmit = async (event) => {
    event.preventDefault(); // 새로고침 방지
    setError("");

    const email = form.email.trim();
    const password = form.password;

    // 프론트에서 먼저 간단한 유효성 검사
    if (!email || !password) {
      setError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setError("올바른 이메일 형식을 입력해 주세요.");
      return;
    }

    setLoading(true);

    try {
      // 서버 POST /api/users/login 호출
      const result = await loginUser({ email, password });

      // 발급받은 JWT 토큰과 유저 정보를 브라우저에 저장
      // (이후 API 요청 시 Authorization 헤더에 사용 가능)
      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      window.alert(result.message || "로그인 성공");
      navigate("/", { replace: true }); // 메인으로 이동
    } catch (err) {
      // 401 등 서버 에러 메시지를 화면에 표시
      setError(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 로그인 여부 확인 중에는 폼을 잠깐 숨김
  if (checkingAuth) {
    return null;
  }

  return (
    <div className="mall">
      <header className="mall-header">
        <div className="mall-header__inner">
          <Link to="/" className="mall-logo">
            VIBE
          </Link>

          <div className="mall-search" aria-hidden="true">
            <span className="mall-search__placeholder">상품을 검색해 보세요</span>
            <span className="mall-search__icon" />
          </div>

          <nav className="mall-header__nav">
            <Link
              to="/login"
              className="mall-header__link mall-header__link--active"
            >
              로그인
            </Link>
            <Link to="/signup" className="mall-header__link">
              회원가입
            </Link>
          </nav>
        </div>
      </header>

      <main className="login">
        <section className="login__panel">
          <h1 className="login__title">로그인</h1>
          <p className="login__lead">이메일과 비밀번호로 로그인해 주세요.</p>

          <form className="login__form" onSubmit={handleSubmit} noValidate>
            <label className="mall-field">
              <span className="mall-field__label">이메일</span>
              <input
                className="mall-field__input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="example@email.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="mall-field">
              <span className="mall-field__label">비밀번호</span>
              <input
                className="mall-field__input"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="비밀번호 입력"
                autoComplete="current-password"
                required
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button
              className="mall-btn mall-btn--blue"
              type="submit"
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="login__links">
            <button type="button" className="login__text-btn">
              아이디 찾기
            </button>
            <span className="login__divider" aria-hidden="true">
              |
            </span>
            <button type="button" className="login__text-btn">
              비밀번호 찾기
            </button>
            <span className="login__divider" aria-hidden="true">
              |
            </span>
            <Link to="/signup" className="login__text-btn">
              회원가입
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Login;
