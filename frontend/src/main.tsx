import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { PlatformSettingsProvider } from "./settings/PlatformSettingsContext";
import { initAnalytics } from "./analytics";
import { initFonts, removeAppBootShell } from "./utils/initFonts";
import { initTheme } from "./utils/theme";
import "./styles/stitch.css";
import "./styles/analytics.css";
import "./styles/typography.css";
import "./styles.css";

initTheme();
initAnalytics();
initFonts();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlatformSettingsProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </PlatformSettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);

requestAnimationFrame(() => removeAppBootShell());
