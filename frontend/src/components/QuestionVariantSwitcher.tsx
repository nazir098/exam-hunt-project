import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchQuestionFamily, type QuestionFamily, type QuestionVariantRef } from "../api";
import { isAiVariantQuestionId } from "../utils/questionFamily";
import { formatVariantTypeLabel } from "../utils/variantLabels";

function dedupeVariants(variants: QuestionVariantRef[]): QuestionVariantRef[] {
  const byNo = new Map<number, QuestionVariantRef>();
  for (const v of variants) {
    if (v.variantNo <= 0) continue;
    const existing = byNo.get(v.variantNo);
    if (!existing) {
      byNo.set(v.variantNo, v);
      continue;
    }
    const preferNew =
      v.questionId.startsWith("AI_") && !existing.questionId.startsWith("AI_")
        ? true
        : !v.questionId.startsWith("AI_") && existing.questionId.startsWith("AI_")
          ? false
          : v.questionId.localeCompare(existing.questionId) < 0;
    if (preferNew) byNo.set(v.variantNo, v);
  }
  return [...byNo.values()].sort((a, b) => a.variantNo - b.variantNo);
}

type Props = {
  questionId: string;
  /** When provided, skips internal family fetch (parent loads once per PYQ). */
  family?: QuestionFamily | null;
  onSelect: (questionId: string) => void;
  className?: string;
};

export default function QuestionVariantSwitcher({
  questionId,
  family: familyProp,
  onSelect,
  className = "",
}: Props) {
  const [familyLocal, setFamilyLocal] = useState<QuestionFamily | null>(null);
  const family = familyProp !== undefined ? familyProp : familyLocal;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (familyProp !== undefined) return;
    let cancelled = false;
    fetchQuestionFamily(questionId)
      .then((data) => {
        if (!cancelled) setFamilyLocal(data);
      })
      .catch(() => {
        if (!cancelled) setFamilyLocal(null);
      });
    return () => {
      cancelled = true;
    };
  }, [questionId, familyProp]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const variants = useMemo(
    () => (family ? dedupeVariants(family.variants) : []),
    [family]
  );

  const activeVariant = useMemo(
    () => variants.find((v) => v.questionId === questionId) ?? null,
    [variants, questionId]
  );

  const activeParent = useMemo(() => {
    if (!family || activeVariant) return false;
    return questionId === family.pyq.questionId;
  }, [family, activeVariant, questionId]);

  const activeLabel = useMemo(() => {
    if (!family) return "AI variations";
    if (activeVariant) {
      return formatVariantTypeLabel(activeVariant.variantType, activeVariant.variantNo);
    }
    if (activeParent) return "Original PYQ";
    if (isAiVariantQuestionId(questionId)) return "AI variation";
    return "AI variation";
  }, [family, activeParent, activeVariant, questionId]);

  const selectVariant = useCallback(
    (targetId: string) => {
      if (targetId === questionId) return;
      setOpen(false);
      onSelect(targetId);
    },
    [questionId, onSelect]
  );

  if (!family || variants.length === 0) return null;

  return (
    <nav
      ref={rootRef}
      className={`question-variant-switcher question-variant-switcher--compact${
        className ? ` ${className}` : ""
      }`}
      aria-label={`AI variations for paper question ${family.paperQuestionNo}`}
    >
      <button
        type="button"
        className="question-variant-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="material-symbols-outlined question-variant-switcher__trigger-icon">
          auto_awesome
        </span>
        <span className="question-variant-switcher__trigger-text">{activeLabel}</span>
        <span className="material-symbols-outlined question-variant-switcher__trigger-chevron">
          expand_more
        </span>
      </button>

      {open && (
        <ul className="question-variant-switcher__menu" role="listbox" aria-label="Choose variation">
          <li role="option" aria-selected={activeParent}>
            <button
              type="button"
              className={`question-variant-switcher__option${activeParent ? " is-active" : ""}`}
              onClick={() => selectVariant(family.pyq.questionId)}
            >
              <span className="question-variant-switcher__option-label">Original PYQ</span>
            </button>
          </li>
          {variants.map((v) => {
            const active = v.questionId === questionId;
            const label = formatVariantTypeLabel(v.variantType, v.variantNo);
            return (
              <li key={v.questionId} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`question-variant-switcher__option question-variant-switcher__option--ai${
                    active ? " is-active" : ""
                  }`}
                  onClick={() => selectVariant(v.questionId)}
                >
                  <span className="question-variant-switcher__option-label">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
