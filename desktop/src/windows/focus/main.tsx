import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import FocusWindowApp from "./FocusWindowApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FocusWindowApp />
  </StrictMode>,
);
