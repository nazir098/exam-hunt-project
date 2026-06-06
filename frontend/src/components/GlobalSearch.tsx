import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  className?: string;
  id?: string;
};

export default function GlobalSearch({ className = "", id = "global-search" }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    const params = new URLSearchParams({ exam: "NEET" });
    if (q) params.set("q", q);
    navigate(`/bank?${params.toString()}`);
  }

  return (
    <form className={`global-search ${className}`} onSubmit={onSubmit} role="search">
      <label className="sr-only" htmlFor={id}>
        Search chapters, topics, and questions
      </label>
      <span className="material-symbols-outlined global-search__icon" aria-hidden>
        search
      </span>
      <input
        id={id}
        type="search"
        className="global-search__input"
        placeholder="Search chapters, topics, years…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      <kbd className="global-search__kbd" aria-hidden>
        ↵
      </kbd>
    </form>
  );
}
