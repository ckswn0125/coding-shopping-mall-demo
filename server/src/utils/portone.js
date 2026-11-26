// 포트원(아임포트) 결제 검증 유틸

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function fetchJson(url, accessToken) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: accessToken,
    },
  });
  return response.json().catch(() => ({}));
}

/**
 * 결제 단건 조회
 * - 일부 환경에서 GET /payments/{imp_uid} 가 "존재하지 않는 결제정보"를 반환함
 * - 그래서 merchant_uid 조회(GET /payments/find/{merchant_uid})를 우선 사용
 */
async function fetchPayment({ impUid, merchantUid }) {
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

  let lastMessage = "결제 정보 조회에 실패했습니다.";

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    // 1) merchant_uid 로 조회 (안정적)
    if (merchantUid) {
      const byMerchant = await fetchJson(
        `https://api.iamport.kr/payments/find/${encodeURIComponent(merchantUid)}`,
        accessToken
      );
      if (byMerchant.code === 0 && byMerchant.response) {
        return byMerchant.response;
      }
      lastMessage = byMerchant.message || lastMessage;
    }

    // 2) imp_uid 로 조회 (가능한 경우 보조)
    if (impUid) {
      const byImp = await fetchJson(
        `https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`,
        accessToken
      );
      if (byImp.code === 0 && byImp.response) {
        return byImp.response;
      }
      lastMessage = byImp.message || lastMessage;
    }

    console.error(
      `[portone] payment lookup failed (try ${attempt}/4):`,
      lastMessage,
      "impUid=",
      impUid,
      "merchantUid=",
      merchantUid
    );

    if (attempt < 4) {
      await sleep(800 * attempt);
    }
  }

  if (String(lastMessage).includes("존재하지 않는 결제정보")) {
    throw new Error(
      "존재하지 않는 결제정보입니다. 결제는 됐을 수 있으니 주문번호(merchant_uid)와 포트원 결제내역을 확인해 주세요."
    );
  }

  throw new Error(lastMessage);
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
  if (!impUid && !merchantUid) {
    throw new Error("impUid 또는 merchantUid가 필요합니다.");
  }

  const payment = await fetchPayment({ impUid, merchantUid });

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

  if (impUid && payment.imp_uid && payment.imp_uid !== impUid) {
    throw new Error("결제번호(imp_uid)가 일치하지 않습니다.");
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
