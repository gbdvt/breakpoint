import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import FloatingSessionWindow from "./FloatingSessionWindow";

document.documentElement.classList.add("floating-root");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FloatingSessionWindow />
  </StrictMode>,
);
