import { LaunchStudio } from "@/components/launch/LaunchStudio";
import { LiveStatsBar } from "@/components/ui/LiveStatsBar";

export const metadata = {
  title: "Bags Launch Studio - SignalCred",
};

export default function LaunchPage() {
  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 mx-auto max-w-7xl px-3 py-3 md:px-4">
        <p className="sr-only">Launch a verified Bags token</p>
        <LaunchStudio />
        <div className="mt-4">
          <LiveStatsBar />
        </div>
      </div>
    </div>
  );
}
