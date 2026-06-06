import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchPublicSettings, type PublicPlatformSettings } from "../api";

const DEFAULTS: PublicPlatformSettings = {
  marketingPyqFloor: 25_000,
  displayTotalQuestions: null,
  displayChapters: null,
  bankSearchSuggestions: ["Rotational Dynamics", "Optics", "Organic Chemistry"],
  learningInsightText:
    "Based on your last mock, you should focus on trends from recent PYQs.",
  learningInsightHighlight: "Inorganic Chemistry",
  aiTutorMockEnabled: true,
  aiTutorWelcome:
    "Hi! I'm your AI Tutor (demo mode). Ask about any NEET topic or PYQ concept.",
  bookmarksEnabled: true,
  aiSuggestEnabled: true,
  aiLlmConfigured: false,
};

type Value = {
  settings: PublicPlatformSettings;
  loading: boolean;
  refresh: () => Promise<void>;
};

const PlatformSettingsContext = createContext<Value | null>(null);

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicPlatformSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await fetchPublicSettings();
      setSettings(s);
    } catch {
      setSettings(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ settings, loading, refresh }), [settings, loading, refresh]);

  return (
    <PlatformSettingsContext.Provider value={value}>{children}</PlatformSettingsContext.Provider>
  );
}

export function usePlatformSettings() {
  const ctx = useContext(PlatformSettingsContext);
  if (!ctx) {
    return { settings: DEFAULTS, loading: false, refresh: async () => {} };
  }
  return ctx;
}
