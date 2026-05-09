import { GrantStatusDashboard } from "@/components/grant/GrantStatusDashboard";

export const metadata = {
  title: "Grant Status - SignalCred",
  description: "Operational grant dashboard for SignalCred trust infrastructure: coverage, freshness, public APIs, policies, and live readiness.",
};

export default function GrantStatusPage() {
  return <GrantStatusDashboard />;
}
