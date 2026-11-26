import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// React 앱을 index.html 의 #root 에 렌더링
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
