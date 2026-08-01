import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@/styles/globals.css";
import "@/styles/brand-refresh.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/app";
import { getCanonicalLocalAuthUrl } from "@/lib/neon/local-auth-origin";

const rootElement = document.getElementById("root");
const canonicalLocalAuthUrl = getCanonicalLocalAuthUrl(
  window.location,
  import.meta.env.DEV,
);

if (!rootElement) {
  throw new Error("Elemen root aplikasi tidak ditemukan.");
}

if (canonicalLocalAuthUrl) {
  window.location.replace(canonicalLocalAuthUrl);
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
