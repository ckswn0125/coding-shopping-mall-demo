// Product 스키마와 동일한 카테고리
// 이미지 바꾸는 법:
// 1) client/public/categories/ 안에 파일 덮어쓰기
//    - outer.jpg / top.jpg / bottom.jpg / shoes.jpg / accessory.jpg
// 2) 또는 아래 image 경로를 원하는 파일명/URL로 수정
export const CATEGORIES = [
  {
    name: "아우터",
    image: "/categories/outer.jpg",
  },
  {
    name: "상의",
    image: "/categories/top.jpg",
  },
  {
    name: "하의",
    image: "/categories/bottom.jpg",
  },
  {
    name: "신발",
    image: "/categories/shoes.jpg",
  },
  {
    name: "악세사리",
    image: "/categories/accessory.jpg",
  },
];

// 배너 이미지: client/public/banners/ 파일 덮어쓰기
// spring.jpg / weekly.jpg / member.jpg
export const BANNERS = [
  {
    slug: "spring",
    title: "SPRING DROP",
    text: "시즌 오프닝 컬렉션",
    collection: "시즌오프닝",
    image: "/banners/spring.jpg",
    tone: "banner--a",
  },
  {
    slug: "weekly",
    title: "WEEKLY BEST",
    text: "지금 가장 많이 찾는 아이템",
    collection: "주간베스트",
    image: "/banners/weekly.jpg",
    tone: "banner--b",
  },
  {
    slug: "member",
    title: "MEMBER DEAL",
    text: "회원 전용 특가 오픈",
    collection: "회원특가",
    image: "/banners/member.jpg",
    tone: "banner--c",
  },
];

export const PRODUCTS = [
  {
    id: "p1",
    brand: "VIBE BASIC",
    name: "오버핏 코튼 셔츠",
    price: "39,000",
    discount: 20,
    tone: "p1",
  },
  {
    id: "p2",
    brand: "NORTH LINE",
    name: "라이트 윈드브레이커",
    price: "79,000",
    discount: 15,
    tone: "p2",
  },
  {
    id: "p3",
    brand: "CITY DENIM",
    name: "와이드 데님 팬츠",
    price: "59,000",
    discount: 25,
    tone: "p3",
  },
  {
    id: "p4",
    brand: "SOFT LAB",
    name: "니트 크루넥",
    price: "49,000",
    discount: 10,
    tone: "p4",
  },
  {
    id: "p5",
    brand: "WALK ON",
    name: "데일리 스니커즈",
    price: "89,000",
    discount: 18,
    tone: "p5",
  },
  {
    id: "p6",
    brand: "POCKET",
    name: "미니 크로스백",
    price: "45,000",
    discount: 12,
    tone: "p6",
  },
  {
    id: "p7",
    brand: "EDGE",
    name: "테크 캡",
    price: "29,000",
    discount: 5,
    tone: "p7",
  },
  {
    id: "p8",
    brand: "FORM",
    name: "슬림 슬랙스",
    price: "54,000",
    discount: 22,
    tone: "p8",
  },
];

// 렌더마다 reverse 하지 않도록 미리 계산
export const NEW_PRODUCTS = [...PRODUCTS].reverse();
