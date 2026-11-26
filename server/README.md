# Shopping Mall Server

Node.js + Express + MongoDB API 서버

## 사전 요구사항

- Node.js 18+
- MongoDB (로컬 실행 또는 Atlas URI)

## 시작하기

```bash
cd server
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run dev
```

서버: `http://localhost:5000`  
헬스체크: `GET /api/health`

## 폴더 구조

```
src/
  config/       # DB 연결 등 설정
  controllers/  # 요청 처리 로직
  middleware/   # 커스텀 미들웨어
  models/       # Mongoose 스키마
  routes/       # 라우트 정의
  app.js        # Express 앱
  index.js      # 서버 진입점
```

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | `5000` |
| `MONGODB_URI` | MongoDB 연결 문자열 | `mongodb://127.0.0.1:27017/shoping-mall` |
| `NODE_ENV` | 실행 환경 | `development` |
