import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@/styles/globals.css";
import { DesktopDataProvider } from "@/context/DesktopDataContext";
import MainRoutes from "./MainRoutes";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <DesktopDataProvider>
        <MainRoutes />
      </DesktopDataProvider>
    </BrowserRouter>
  </StrictMode>,
);
