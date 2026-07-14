import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { BRAND_NAME } from "../design/stitchAssets";
import ProfileMenu from "./ProfileMenu";
import ThemeToggle from "./ThemeToggle";

export default function MobileSiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    const params = new URLSearchParams({ exam: "NEET" });
    if (q) params.set("q", q);
    setSearchOpen(false);
    navigate(`/practice?${params.toString()}#question-bank`);
  }

  return (
    <header className="stitch-mobile-header lg:hidden">
      <div className="stitch-mobile-header__row">
        <Link to="/" className="stitch-mobile-header__brand stitch-logo">
          {BRAND_NAME}
        </Link>
        <div className="stitch-mobile-header__actions">
          <ThemeToggle className="stitch-theme-toggle--mobile" />
          <button
            type="button"
            className="stitch-mobile-icon-btn"
            aria-label={searchOpen ? "Close search" : "Search questions"}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
          >
            <span className="material-symbols-outlined" aria-hidden>
              {searchOpen ? "close" : "search"}
            </span>
          </button>
          {user ? (
            <ProfileMenu variant="mobile" />
          ) : (
            <Link to="/login" className="stitch-mobile-icon-btn" aria-label="Sign in" title="Sign in">
              <span className="material-symbols-outlined" aria-hidden>
                person
              </span>
            </Link>
          )}
        </div>
      </div>
      {searchOpen && (
        <form className="stitch-mobile-search" onSubmit={onSearchSubmit} role="search">
          <label className="sr-only" htmlFor="mobile-header-search">
            Search chapters, topics, and questions
          </label>
          <span className="material-symbols-outlined stitch-mobile-search__icon" aria-hidden>
            search
          </span>
          <input
            id="mobile-header-search"
            type="search"
            className="stitch-mobile-search__input"
            placeholder="Search chapters, topics, years…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
        </form>
      )}
    </header>
  );
}
