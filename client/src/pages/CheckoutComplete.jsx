import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createOrder } from "../api/orders";
import { notifyCartUpdated } from "../utils/cartEvents";

// 모바일 결제 완료 후 m_redirect_url 로 돌아오는 페이지
// 쿼리: imp_uid, merchant_uid, imp_success, error_msg
function CheckoutComplete() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("결제 결과를 확인하는 중...");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const impSuccess = searchParams.get("imp_success");
    const impUid = searchParams.get("imp_uid");
    const merchantUid = searchParams.get("merchant_uid");
    const errorMsg = searchParams.get("error_msg");

    const finishError = (text) => {
      setFailed(true);
      setMessage(text);
    };

    if (impSuccess === "false" || !impUid) {
      finishError(errorMsg || "결제가 취소되었거나 실패했습니다.");
      return;
    }

    let pending;
    try {
      pending = JSON.parse(
        localStorage.getItem("pendingOrder") ||
          sessionStorage.getItem("pendingOrder") ||
          "null"
      );
    } catch {
      pending = null;
    }

    if (!pending?.cartItemIds?.length || !pending?.shippingAddress) {
      finishError("주문 정보가 만료되었습니다. 장바구니에서 다시 시도해 주세요.");
      return;
    }

    createOrder({
      cartItemIds: pending.cartItemIds,
      paymentMethod: pending.paymentMethod,
      impUid,
      merchantUid: merchantUid || "",
      shippingAddress: pending.shippingAddress,
    })
      .then((result) => {
        sessionStorage.removeItem("checkoutItemIds");
        sessionStorage.removeItem("pendingOrder");
        localStorage.removeItem("pendingOrder");
        notifyCartUpdated();
        navigate(`/orders/${result.order._id}/success`, { replace: true });
      })
      .catch((err) => {
        finishError(
          err.message ||
            "결제는 완료되었지만 주문 저장에 실패했습니다. 고객센터로 문의해 주세요."
        );
      });
  }, [navigate, searchParams]);

  return (
    <div className="mall">
      <main className="checkout-page">
        <h1 className="checkout-page__title">결제 확인</h1>
        <p className={failed ? "cart-status cart-status--error" : "cart-status"}>
          {message}
        </p>
        {failed && (
          <Link to="/cart" className="cart-btn cart-btn--solid">
            장바구니로 돌아가기
          </Link>
        )}
      </main>
    </div>
  );
}

export default CheckoutComplete;
