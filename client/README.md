# Shopping Mall Client

Vite + React 프론트엔드

## 시작하기

```bash
cd client
npm install
npm run dev
```

앱: `http://localhost:5173`

서버(`server`)도 함께 실행해야 `/api/health` 연결이 됩니다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | oxlint |

## 폴더 구조

```
src/
  api/          # API 호출
  components/   # 재사용 컴포넌트
  pages/        # 페이지
  App.jsx
  main.jsx
```

## API 프록시

개발 중 `/api/*` 요청은 Vite가 `http://localhost:5000`으로 프록시합니다.
직접 주소를 쓰려면 `.env`의 `VITE_API_BASE_URL`을 설정하세요.
