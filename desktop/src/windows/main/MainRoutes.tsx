import { Route, Routes } from "react-router-dom";
import AppShell from "@/components/ui/AppShell";
import DashboardPage from "@/components/dashboard/DashboardPage";
import SessionDetailView from "./SessionDetailView";
import StatsView from "./StatsView";

export default function MainRoutes() {
  return (
    <AppShell userFirstName="Gaspar">
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/stats" element={<StatsView />} />
        <Route path="/session/:id" element={<SessionDetailView />} />
      </Routes>
    </AppShell>
  );
}
