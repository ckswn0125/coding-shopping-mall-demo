import { memo } from "react";
import { Link } from "react-router-dom";
import { CATEGORIES } from "../data/home";

function HomeCategories() {
  return (
    <section className="home-section">
      <div className="home-section__head">
        <h2 className="home-section__title">카테고리</h2>
      </div>
      <ul className="home-categories">
        {CATEGORIES.map((category) => (
          <li key={category.name}>
            <Link
              to={`/category/${encodeURIComponent(category.name)}`}
              className="home-category"
            >
              <span className="home-category__media">
                <img src={category.image} alt="" />
              </span>
              <span className="home-category__label">{category.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default memo(HomeCategories);
