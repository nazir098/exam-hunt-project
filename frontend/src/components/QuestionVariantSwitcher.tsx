import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchQuestionFamily, type QuestionFamily, type QuestionVariantRef } from "../api";
import {
  formatVariantTypeLabel,
  ORIGINAL_SWITCH_DELAY_MS,
  VARIANT_SWITCH_DELAY_MS,
  type VariantSwitchMode,
  type VariantSwitchState,
  VARIANT_SWITCH_IDLE,
} from "../utils/variantLabels";

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
  onSwitchStateChange?: (state: VariantSwitchState) => void;
};

export default function QuestionVariantSwitcher({
  questionId,
  family: familyProp,
  onSelect,
  className = "",
  onSwitchStateChange,
}: Props) {
  const [familyLocal, setFamilyLocal] = useState<QuestionFamily | null>(null);
  const family = familyProp !== undefined ? familyProp : familyLocal;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<VariantSwitchState>(VARIANT_SWITCH_IDLE);
  const rootRef = useRef<HTMLDivElement>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    onSwitchStateChange?.(pending);
  }, [pending, onSwitchStateChange]);

  useEffect(() => {
    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
    };
  }, []);

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

  const activeVariantNo = useMemo(() => {
    if (!family) return 0;
    return (
      family.variants.find((v) => v.questionId === family.activeQuestionId)?.variantNo ?? 0
    );
  }, [family]);

  const activeParent = family?.activeQuestionId === family?.pyq.questionId;

  const activeVariant = useMemo(
    () => variants.find((v) => v.variantNo === activeVariantNo) ?? null,
    [variants, activeVariantNo]
  );

  const activeLabel = useMemo(() => {
    if (!family) return "AI variations";
    if (activeParent) return "Original PYQ";
    if (activeVariant) {
      return formatVariantTypeLabel(activeVariant.variantType, activeVariant.variantNo);
    }
    return "AI variation";
  }, [family, activeParent, activeVariant]);

  const scheduleSelect = useCallback(
    (targetId: string, label: string, mode: VariantSwitchMode) => {
      if (pending.active || targetId === family?.activeQuestionId) return;
      setOpen(false);
      const delay = mode === "ai" ? VARIANT_SWITCH_DELAY_MS : ORIGINAL_SWITCH_DELAY_MS;
      setPending({ active: true, mode, label });
      if (delayRef.current) clearTimeout(delayRef.current);
      delayRef.current = setTimeout(() => {
        delayRef.current = null;
        setPending(VARIANT_SWITCH_IDLE);
        onSelect(targetId);
      }, delay);
    },
    [family?.activeQuestionId, onSelect, pending.active]
  );

  if (!family || variants.length === 0) return null;

  const isAiPending = pending.active && pending.mode === "ai";
  const isNormalPending = pending.active && pending.mode === "normal";
  const triggerLabel = isAiPending
    ? `Generating ${pending.label.toLowerCase()}…`
    : isNormalPending
      ? "Loading original…"
      : activeLabel;

  return (
    <nav
      ref={rootRef}
      className={`question-variant-switcher question-variant-switcher--compact${
        pending.active ? " is-pending" : ""
      }${isAiPending ? " is-pending-ai" : ""}${isNormalPending ? " is-pending-normal" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-label={`AI variations for paper question ${family.paperQuestionNo}`}
    >
      <button
        type="button"
        className="question-variant-switcher__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending.active}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="material-symbols-outlined question-variant-switcher__trigger-icon">
          {isNormalPending ? "description" : pending.active ? "progress_activity" : "auto_awesome"}
        </span>
        <span className="question-variant-switcher__trigger-text">{triggerLabel}</span>
        {!pending.active && (
          <span className="material-symbols-outlined question-variant-switcher__trigger-chevron">
            expand_more
          </span>
        )}
      </button>

      {isAiPending && (
        <div className="question-variant-switcher__gen-bar" aria-hidden>
          <span className="question-variant-switcher__gen-bar-fill" />
        </div>
      )}

      {open && !pending.active && (
        <ul className="question-variant-switcher__menu" role="listbox" aria-label="Choose variation">
          <li role="option" aria-selected={activeParent}>
            <button
              type="button"
              className={`question-variant-switcher__option${activeParent ? " is-active" : ""}`}
              onClick={() => scheduleSelect(family.pyq.questionId, "Original PYQ", "normal")}
            >
              <span className="question-variant-switcher__option-label">Original PYQ</span>
            </button>
          </li>
          {variants.map((v) => {
            const active =
              activeVariantNo > 0
                ? v.variantNo === activeVariantNo
                : family.activeQuestionId === v.questionId;
            const label = formatVariantTypeLabel(v.variantType, v.variantNo);
            return (
              <li key={v.questionId} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`question-variant-switcher__option question-variant-switcher__option--ai${
                    active ? " is-active" : ""
                  }`}
                  onClick={() => scheduleSelect(v.questionId, label, "ai")}
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
