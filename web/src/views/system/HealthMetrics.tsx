import HardwarePane from "@/components/health/HardwarePane";
import NoticesPane from "@/components/health/NoticesPane";
import type { NoticeFilter } from "@/types/health";

type HealthMetricsProps = {
  noticeFilter: NoticeFilter;
};

export default function HealthMetrics({ noticeFilter }: HealthMetricsProps) {
  return (
    <div className="scrollbar-container mt-4 flex size-full flex-col gap-4 overflow-y-auto">
      <NoticesPane filter={noticeFilter} />
      <HardwarePane />
    </div>
  );
}
