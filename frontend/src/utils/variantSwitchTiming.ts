import type { MutableRefObject } from "react";

export const VARIANT_SWITCH_MIN_MS = 1000;

export type VariantSwitchGate = {
  targetId: string;
  startedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
};

export function beginVariantSwitch(
  gate: MutableRefObject<VariantSwitchGate | null>,
  targetId: string,
  setLoading: (loading: boolean) => void
) {
  if (gate.current?.timer) {
    clearTimeout(gate.current.timer);
  }
  gate.current = { targetId, startedAt: Date.now(), timer: null };
  setLoading(true);
}

export function finishVariantSwitchLoading(
  gate: MutableRefObject<VariantSwitchGate | null>,
  loadedId: string,
  setLoading: (loading: boolean) => void
) {
  const active = gate.current;
  if (!active || active.targetId !== loadedId) {
    setLoading(false);
    return;
  }
  const remaining = VARIANT_SWITCH_MIN_MS - (Date.now() - active.startedAt);
  const complete = () => {
    if (gate.current?.targetId === loadedId) {
      gate.current = null;
    }
    setLoading(false);
  };
  if (remaining <= 0) {
    complete();
    return;
  }
  active.timer = setTimeout(complete, remaining);
  gate.current = active;
}

export function clearVariantSwitchGate(gate: MutableRefObject<VariantSwitchGate | null>) {
  if (gate.current?.timer) {
    clearTimeout(gate.current.timer);
  }
  gate.current = null;
}

export function resolveContentLoadingEnd(
  gate: MutableRefObject<VariantSwitchGate | null>,
  loadedId: string,
  setLoading: (loading: boolean) => void
) {
  if (gate.current?.targetId === loadedId) {
    finishVariantSwitchLoading(gate, loadedId, setLoading);
  } else {
    setLoading(false);
  }
}
