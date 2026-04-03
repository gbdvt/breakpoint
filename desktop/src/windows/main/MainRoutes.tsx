import { Route, Routes } from "react-router-dom";
import NarrowPanelLayout from "@/components/layout/NarrowPanelLayout";
import QueueHomePage from "@/components/dashboard/QueueHomePage";
import SessionsListPage from "@/components/dashboard/SessionsListPage";
import SessionDetailView from "./SessionDetailView";
import StatsView from "./StatsView";

export default function MainRoutes() {
  return (
    <Routes>
      <Route element={<NarrowPanelLayout />}>
        <Route path="/" element={<QueueHomePage />} />
        <Route path="/sessions" element={<SessionsListPage />} />
        <Route path="/stats" element={<StatsView />} />
        <Route path="/session/:id" element={<SessionDetailView />} />
      </Route>
    </Routes>
  );
}
