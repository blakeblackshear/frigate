import HardwarePane from "@/components/health/HardwarePane";
import NoticesPane from "@/components/health/NoticesPane";

export default function HealthMetrics() {
  return (
    <div className="scrollbar-container mt-4 flex size-full flex-col gap-4 overflow-y-auto">
      <NoticesPane />
      <HardwarePane />
    </div>
  );
}
