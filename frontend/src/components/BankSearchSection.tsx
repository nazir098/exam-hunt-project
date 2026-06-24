import { FormEvent, useEffect, useState } from "react";
import HintTooltip from "./HintTooltip";
import { BANK_MODE_HINT } from "../navigation/modeHints";
import { useSearchParams } from "react-router-dom";
import { parseBankSearchQuery } from "../utils/bankSearch";

type Props = {
  onOpenFilters: () => void;
};

export default function BankSearchSection({ onOpenFilters }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [draft, setDraft] = useState(q);
  const [glow, setGlow] = useState(false);

  useEffect(() => {
    setDraft(q);
  }, [q]);

  function applySearchParams(next: URLSearchParams) {
    setSearchParams(next);
  }

  function applyQuery(value: string) {
    const trimmed = value.trim();
    const next = new URLSearchParams(searchParams);
    const parsedQuery = parseBankSearchQuery(trimmed);
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    if (parsedQuery.year) next.set("year", String(parsedQuery.year));
    next.set("page", "0");
    if (!next.get("exam")) next.set("exam", "NEET");
    applySearchParams(next);
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    applyQuery(draft);
  }

  return (
    <section className="mb-xl">
      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="w-full flex-1 space-y-2">
          <div className="flex items-center gap-2 px-2 text-primary">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span className="text-label-md font-label-md uppercase tracking-widest">Question Bank</span>
            <HintTooltip text={BANK_MODE_HINT} />
          </div>
          <form onSubmit={submit}>
            <div className={`relative group ${glow ? "ai-glow rounded-xl" : ""}`}>
              <input
                name="q"
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setGlow(true)}
                onBlur={() => setGlow(false)}
                enterKeyHint="search"
                className="w-full bg-surface-container-low border border-outline-variant rounded-xl pl-12 pr-4 sm:pr-16 py-4 text-on-surface focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                placeholder="Year, topic, or Q no…"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex gap-2">
                <span className="bg-surface-container-highest text-caption px-2 py-1 rounded text-outline">
                  ⌘ K
                </span>
              </div>
            </div>
          </form>
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex items-center gap-2 bg-surface-container-high px-6 py-4 rounded-xl border border-white/10 hover:bg-surface-container-highest transition-all text-on-surface shrink-0 lg:hidden"
        >
          <span className="material-symbols-outlined">tune</span>
          <span className="font-label-md">Filter</span>
        </button>
      </div>
    </section>
  );
}
