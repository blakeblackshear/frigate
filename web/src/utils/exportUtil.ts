import { Export, ExportJob } from "@/types/export";

export function isCaseDownloadReady(
  exports: Export[],
  activeJobs: ExportJob[],
): boolean {
  return (
    exports.length > 0 &&
    activeJobs.length === 0 &&
    !exports.some((exp) => exp.in_progress)
  );
}
