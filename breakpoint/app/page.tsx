import AppShell from "@/src/components/ui/AppShell";
import DashboardPage from "@/src/components/dashboard/DashboardPage";

export default function HomePage() {
  return (
    <AppShell userFirstName="Gaspar">
      <DashboardPage />
    </AppShell>
  );
}
