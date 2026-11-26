import { memo } from "react";
import { Link } from "react-router-dom";

function HomeFooter() {
  return (
    <footer className="mall-footer">
      <div className="mall-footer__inner">
        <div>
          <p className="mall-footer__brand">VIBE MALL</p>
          <p className="mall-footer__text">
            고객센터 1544-0000 · 평일 09:00 - 18:00
          </p>
        </div>
        <div className="mall-footer__links">
          <span>회사소개</span>
          <span>이용약관</span>
          <span>개인정보처리방침</span>
          <Link to="/signup">회원가입</Link>
        </div>
      </div>
    </footer>
  );
}

export default memo(HomeFooter);
