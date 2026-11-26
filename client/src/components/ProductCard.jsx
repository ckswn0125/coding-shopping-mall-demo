import { memo } from "react";
import { Link } from "react-router-dom";

function ProductCard({ product }) {
  const mediaStyle = product.image
    ? {
        backgroundImage: `url(${product.image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  const productId = product.id || product._id;

  return (
    <Link to={`/products/${productId}`} className="product-card">
      <div
        className={`product-card__media${
          product.tone ? ` product-card__media--${product.tone}` : ""
        }`}
        style={mediaStyle}
        role="img"
        aria-label={product.name}
      />
      <div className="product-card__body">
        <p className="product-card__brand">{product.brand}</p>
        <h3 className="product-card__name">{product.name}</h3>
        <p className="product-card__price">
          {product.discount != null && (
            <span className="product-card__discount">{product.discount}%</span>
          )}
          {product.price}원
        </p>
      </div>
    </Link>
  );
}

export default memo(ProductCard);
