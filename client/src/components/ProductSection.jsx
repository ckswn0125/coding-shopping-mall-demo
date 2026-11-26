import { memo } from "react";
import ProductCard from "./ProductCard";

function ProductSection({
  title,
  description,
  products,
  last = false,
  gridClassName = "",
}) {
  return (
    <section className={`home-section${last ? " home-section--last" : ""}`}>
      <div className="home-section__head">
        <h2 className="home-section__title">{title}</h2>
        {description && <p className="home-section__desc">{description}</p>}
      </div>
      <div
        className={`home-products${gridClassName ? ` ${gridClassName}` : ""}`}
      >
        {products.length === 0 ? (
          <p className="home-products-status">표시할 상품이 없습니다.</p>
        ) : (
          products.map((product) => (
            <ProductCard key={product.id || product._id} product={product} />
          ))
        )}
      </div>
    </section>
  );
}

export default memo(ProductSection);
