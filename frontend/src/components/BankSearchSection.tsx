import { FormEvent, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

type Props = {
  onOpenFilters: () => void;
};

const SUGGESTIONS = ["Rotational Dynamics", "Optics", "Organic Chemistry"];

export default function BankSearchSection({ onOpenFilters }: Props) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get("q") || "";
  const [glow, setGlow] = useState(false);
  const basePath = pathname.startsWith("/pack/") ? pathname : "/bank";

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get("q") as string;
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    next.set("page", "0");
    if (!next.get("exam")) next.set("exam", "NEET");
    navigate(`${basePath}?${next.toString()}`);
  }

  function applySuggestion(topic: string) {
    const next = new URLSearchParams(searchParams);
    next.set("q", topic);
    next.set("page", "0");
    navigate(`${basePath}?${next.toString()}`);
  }

  return (
    <section className="mb-xl">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full flex-1 space-y-2">
          <div className="flex items-center gap-2 px-2 text-primary">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span className="text-label-md font-label-md uppercase tracking-widest">AI Intelligent Search</span>
          </div>
          <form onSubmit={submit}>
            <div className={`relative group ${glow ? "ai-glow rounded-xl" : ""}`}>
              <input
                name="q"
                type="text"
                defaultValue={q}
                onFocus={() => setGlow(true)}
                onBlur={() => setGlow(false)}
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-12 py-4 text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                placeholder="Search topics, questions, or 'Problems like JEE 2023 Physics'..."
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                <span className="bg-surface-container-highest text-caption px-2 py-1 rounded text-outline">⌘ K</span>
              </div>
            </div>
          </form>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-caption text-outline">AI Suggestions:</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applySuggestion(s)}
                className="text-caption bg-surface-container/50 border border-white/5 hover:border-primary/50 px-3 py-1 rounded-full transition-all text-on-surface-variant"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex items-center gap-2 bg-surface-container-high px-6 py-4 rounded-xl border border-white/10 hover:bg-surface-container-highest transition-all text-on-surface shrink-0"
        >
          <span className="material-symbols-outlined">tune</span>
          <span className="font-label-md">Filter</span>
        </button>
      </div>
    </section>
  );
}
