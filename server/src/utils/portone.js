// 포트원(아임포트) 결제 검증 유틸

async function getAccessToken() {
  const impKey = (process.env.PORTONE_API_KEY || "").trim();
  const impSecret = (process.env.PORTONE_API_SECRET || "").trim();

  if (!impKey || !impSecret) {
    return null;
  }

  const response = await fetch("https://api.iamport.kr/users/getToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imp_key: impKey,
      imp_secret: impSecret,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (data.code !== 0 || !data.response?.access_token) {
    throw new Error(
      data.message ||
        "포트원 토큰 발급에 실패했습니다. Heroku의 PORTONE_API_KEY / PORTONE_API_SECRET 을 확인해 주세요."
    );
  }

  return data.response.access_token;
}

async function fetchPayment(impUid) {
  const accessToken = await getAccessToken();

  // API 키가 없으면 개발용: 클라이언트 결제 결과를 신뢰 (검증 스킵)
  if (!accessToken) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PORTONE_API_KEY / PORTONE_API_SECRET 환경변수가 필요합니다."
      );
    }
    console.warn(
      "[portone] API 키가 없어 결제 검증을 건너뜁니다. (개발 모드)"
    );
    return null;
  }

  const response = await fetch(
    `https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`,
    {
      method: "GET",
      headers: {
        Authorization: accessToken,
      },
    }
  );

  const data = await response.json();

  if (data.code !== 0 || !data.response) {
    throw new Error(data.message || "결제 정보 조회에 실패했습니다.");
  }

  return data.response;
}

/**
 * 결제 검증
 * @returns {{ verified: boolean, payment: object|null, paid: boolean }}
 */
async function verifyPayment({
  impUid,
  merchantUid,
  expectedAmount,
  allowReady = false,
}) {
  if (!impUid) {
    throw new Error("impUid가 필요합니다.");
  }

  const payment = await fetchPayment(impUid);

  // 개발 모드 + API 키 없음
  if (!payment) {
    return {
      verified: true,
      payment: null,
      paid: !allowReady,
    };
  }

  if (merchantUid && payment.merchant_uid !== merchantUid) {
    throw new Error("주문번호(merchant_uid)가 일치하지 않습니다.");
  }

  if (Number(payment.amount) !== Number(expectedAmount)) {
    throw new Error(
      `결제 금액이 일치하지 않습니다. (요청 ${expectedAmount} / 결제 ${payment.amount})`
    );
  }

  const status = payment.status; // paid | ready | failed | cancelled | ...
  const paid = status === "paid";
  const readyOk = allowReady && status === "ready";

  if (!paid && !readyOk) {
    throw new Error(`결제가 완료되지 않았습니다. (status: ${status})`);
  }

  return {
    verified: true,
    payment,
    paid,
  };
}

module.exports = {
  verifyPayment,
};
