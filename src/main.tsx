import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@/styles/globals.css";
import "@/styles/brand-refresh.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/app/app";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemen root aplikasi tidak ditemukan.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
