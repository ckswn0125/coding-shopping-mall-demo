import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Admin from "./pages/Admin";
import Cart from "./pages/Cart";
import Category from "./pages/Category";
import Collection from "./pages/Collection";
import Checkout from "./pages/Checkout";
import CheckoutComplete from "./pages/CheckoutComplete";
import Home from "./pages/Home";
import Login from "./pages/Login";
import OrderDetail from "./pages/OrderDetail";
import OrderSuccess from "./pages/OrderSuccess";
import Orders from "./pages/Orders";
import ProductCreate from "./pages/ProductCreate";
import ProductDetail from "./pages/ProductDetail";
import ProductEdit from "./pages/ProductEdit";
import Search from "./pages/Search";
import Signup from "./pages/Signup";
import "./App.css";

// 페이지 라우팅 설정
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} /> {/* 메인 */}
        <Route path="/login" element={<Login />} /> {/* 로그인 */}
        <Route path="/signup" element={<Signup />} /> {/* 회원가입 */}
        <Route path="/search" element={<Search />} /> {/* 상품 검색 */}
        <Route path="/category/:category" element={<Category />} /> {/* 카테고리 상품 */}
        <Route path="/collection/:slug" element={<Collection />} /> {/* 배너 컬렉션 */}
        <Route path="/products/:id" element={<ProductDetail />} /> {/* 상품 상세 */}
        <Route path="/cart" element={<Cart />} /> {/* 장바구니 */}
        <Route path="/checkout" element={<Checkout />} /> {/* 주문서 */}
        <Route path="/checkout/complete" element={<CheckoutComplete />} /> {/* 모바일 결제 완료 */}
        <Route path="/orders" element={<Orders />} /> {/* 주문 내역 */}
        <Route path="/orders/:id/success" element={<OrderSuccess />} /> {/* 주문 성공 */}
        <Route path="/orders/:id" element={<OrderDetail />} /> {/* 주문 상세 */}
        <Route path="/admin" element={<Admin />} /> {/* 어드민 */}
        <Route path="/admin/products/new" element={<ProductCreate />} /> {/* 상품 등록 */}
        <Route path="/admin/products/:id/edit" element={<ProductEdit />} /> {/* 상품 수정 */}
        {/* 없는 주소는 메인으로 보냄 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
