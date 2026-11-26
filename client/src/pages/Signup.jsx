import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUser } from "../api/users";

// 회원가입 폼 초기값
const initialForm = {
  email: "",
  name: "",
  password: "",
  passwordConfirm: "",
  phone: "",
};

// 약관 동의 초기값
const initialAgreements = {
  terms: false,
  privacy: false,
  marketing: false,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 약관 "보기"에 보여줄 상세 내용
const agreementDetails = {
  terms: {
    title: "이용약관",
    body: `제1조 (목적)
본 약관은 VIBE MALL(이하 "회사")가 제공하는 쇼핑몰 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정합니다.

제2조 (회원가입)
회원은 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의함으로써 회원가입을 신청합니다.

제3조 (회원의 의무)
회원은 관계 법령, 본 약관의 규정, 이용안내 및 주의사항을 준수하여야 하며, 회사의 업무에 방해되는 행위를 하여서는 안 됩니다.`,
  },
  privacy: {
    title: "개인정보처리방침",
    body: `1. 수집하는 개인정보 항목
필수항목: 이메일, 이름, 비밀번호, 휴대폰 번호

2. 개인정보의 수집 및 이용 목적
회원 식별, 가입 의사 확인, 서비스 제공 및 계약 이행, 고객 문의 대응

3. 개인정보의 보유 및 이용 기간
회원 탈퇴 시까지 보관하며, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.

4. 동의 거부 권리
개인정보 수집·이용에 대한 동의를 거부할 수 있으나, 필수 항목 동의 거부 시 회원가입이 제한됩니다.`,
  },
  marketing: {
    title: "마케팅 정보 수신",
    body: `회사는 신규 상품, 이벤트, 할인 혜택 등 마케팅 정보를 이메일, SMS, 앱 푸시 등으로 발송할 수 있습니다.

본 동의는 선택 사항이며, 동의하지 않아도 회원가입 및 서비스 이용이 가능합니다.
수신 동의 후에도 회원정보 수정 또는 고객센터를 통해 언제든지 철회할 수 있습니다.`,
  },
};

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [agreements, setAgreements] = useState(initialAgreements);
  const [openDetail, setOpenDetail] = useState(null); // 펼쳐진 약관 키
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // 필수 약관(이용약관, 개인정보) 동의 여부
  const allRequiredChecked = agreements.terms && agreements.privacy;
  // 전체 동의 체크박스 상태
  const allChecked =
    agreements.terms && agreements.privacy && agreements.marketing;

  // 입력 필드 변경
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 개별 약관 체크
  const handleAgreementChange = (event) => {
    const { name, checked } = event.target;
    setAgreements((prev) => ({ ...prev, [name]: checked }));
  };

  // 전체 동의 체크/해제
  const handleAgreeAll = (event) => {
    const checked = event.target.checked;
    setAgreements({
      terms: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  // 약관 상세 보기/닫기
  const toggleDetail = (key) => {
    setOpenDetail((prev) => (prev === key ? null : key));
  };

  // 가입하기: 유효성 검사 후 서버에 유저 생성 요청
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.email.trim() || !form.name.trim() || !form.password || !form.phone.trim()) {
      setError("필수 정보를 모두 입력해 주세요.");
      return;
    }

    if (!EMAIL_REGEX.test(form.email.trim())) {
      setError("올바른 이메일 형식을 입력해 주세요. (예: name@example.com)");
      return;
    }

    if (form.password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    if (form.password !== form.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!agreements.terms || !agreements.privacy) {
      setError("필수 약관에 모두 동의해 주세요.");
      return;
    }

    setLoading(true);

    try {
      // POST /api/users 로 회원가입
      await createUser({
        email: form.email.trim(),
        name: form.name.trim(),
        password: form.password,
        phone: form.phone.trim(),
        user_type: "customer",
        agreements: {
          terms: agreements.terms,
          privacy: agreements.privacy,
          marketing: agreements.marketing,
        },
      });

      setSuccess("회원가입 성공");
      window.alert("회원가입 성공");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="signup">
      <div className="signup__atmosphere" aria-hidden="true" />

      <section className="signup__panel">
        <header className="signup__header">
          <Link to="/" className="brand brand--link">
            VIBE MALL
          </Link>
          <h1 className="signup__title">회원가입</h1>
          <p className="signup__lead">회원 정보를 입력해 주세요.</p>
        </header>

        <form className="signup__form" onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">이메일</span>
            <input
              className="field__input"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
              autoComplete="email"
              inputMode="email"
              pattern="[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}"
              title="올바른 이메일 형식으로 입력해 주세요. (예: name@example.com)"
              required
            />
          </label>

          <label className="field">
            <span className="field__label">이름</span>
            <input
              className="field__input"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="홍길동"
              autoComplete="name"
              required
            />
          </label>

          <label className="field">
            <span className="field__label">비밀번호</span>
            <input
              className="field__input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="6자 이상"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">비밀번호 확인</span>
            <input
              className="field__input"
              type="password"
              name="passwordConfirm"
              value={form.passwordConfirm}
              onChange={handleChange}
              placeholder="비밀번호를 다시 입력"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <label className="field">
            <span className="field__label">휴대폰</span>
            <input
              className="field__input"
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="010-1234-5678"
              autoComplete="tel"
              required
            />
          </label>

          <fieldset className="agreements">
            <legend className="agreements__legend">약관 동의</legend>

            <label className="agree agree--all">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={handleAgreeAll}
              />
              <span>전체 동의합니다</span>
            </label>

            <div className="agreements__list">
              <div className="agree-row">
                <label className="agree">
                  <input
                    type="checkbox"
                    name="terms"
                    checked={agreements.terms}
                    onChange={handleAgreementChange}
                  />
                  <span>
                    <em className="agree__required">[필수]</em> 이용약관 동의
                  </span>
                </label>
                <button
                  type="button"
                  className="agree__view"
                  onClick={() => toggleDetail("terms")}
                  aria-expanded={openDetail === "terms"}
                >
                  {openDetail === "terms" ? "닫기" : "보기"}
                </button>
              </div>
              {openDetail === "terms" && (
                <pre className="agree__detail">{agreementDetails.terms.body}</pre>
              )}

              <div className="agree-row">
                <label className="agree">
                  <input
                    type="checkbox"
                    name="privacy"
                    checked={agreements.privacy}
                    onChange={handleAgreementChange}
                  />
                  <span>
                    <em className="agree__required">[필수]</em> 개인정보처리방침
                    동의
                  </span>
                </label>
                <button
                  type="button"
                  className="agree__view"
                  onClick={() => toggleDetail("privacy")}
                  aria-expanded={openDetail === "privacy"}
                >
                  {openDetail === "privacy" ? "닫기" : "보기"}
                </button>
              </div>
              {openDetail === "privacy" && (
                <pre className="agree__detail">{agreementDetails.privacy.body}</pre>
              )}

              <div className="agree-row">
                <label className="agree">
                  <input
                    type="checkbox"
                    name="marketing"
                    checked={agreements.marketing}
                    onChange={handleAgreementChange}
                  />
                  <span>
                    <em className="agree__optional">[선택]</em> 마케팅 정보 수신
                    동의
                  </span>
                </label>
                <button
                  type="button"
                  className="agree__view"
                  onClick={() => toggleDetail("marketing")}
                  aria-expanded={openDetail === "marketing"}
                >
                  {openDetail === "marketing" ? "닫기" : "보기"}
                </button>
              </div>
              {openDetail === "marketing" && (
                <pre className="agree__detail">
                  {agreementDetails.marketing.body}
                </pre>
              )}
            </div>

            {!allRequiredChecked && (
              <p className="agreements__hint">
                필수 약관(이용약관, 개인정보처리방침)에 동의해야 가입할 수
                있습니다.
              </p>
            )}
          </fieldset>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">{success}</p>}

          <button
            className="btn btn--primary btn--block"
            type="submit"
            disabled={loading}
          >
            {loading ? "가입 중..." : "가입하기"}
          </button>
        </form>

        <p className="signup__footer">
          이미 계정이 있으신가요? <Link to="/">메인으로</Link>
        </p>
      </section>
    </main>
  );
}

export default Signup;
