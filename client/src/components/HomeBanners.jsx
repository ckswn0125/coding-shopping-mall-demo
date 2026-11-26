import { memo } from "react";
import { Link } from "react-router-dom";
import { BANNERS } from "../data/home";

function HomeBanners() {
  return (
    <section className="home-banners" aria-label="추천 배너">
      {BANNERS.map((banner) => (
        <Link
          key={banner.slug}
          to={`/collection/${banner.slug}`}
          className={`home-banner ${banner.tone}`}
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.62)), url(${banner.image})`,
          }}
        >
          <p className="home-banner__eyebrow">VIBE MALL</p>
          <h2 className="home-banner__title">{banner.title}</h2>
          <p className="home-banner__text">{banner.text}</p>
        </Link>
      ))}
    </section>
  );
}

export default memo(HomeBanners);
