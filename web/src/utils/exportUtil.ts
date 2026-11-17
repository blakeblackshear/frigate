import { Export } from "@/types/export";

export function isCaseDownloadReady(
  exports: Export[],
  hasPendingJobs: boolean,
): boolean {
  return (
    exports.length > 0 &&
    !hasPendingJobs &&
    !exports.some((exp) => exp.in_progress)
  );
}
