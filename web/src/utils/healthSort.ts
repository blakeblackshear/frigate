import type { HealthProblem } from "@/types/health";

const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 } as const;
const SOURCE_ORDER = { registry: 0, live: 1, config: 2, stream: 3 } as const;

/** errors first, then warnings, then info; within a severity by source, then scope */
export function sortHealthProblems(problems: HealthProblem[]): HealthProblem[] {
  return [...problems].sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      SOURCE_ORDER[a.source] - SOURCE_ORDER[b.source] ||
      (a.scope ?? "").localeCompare(b.scope ?? ""),
  );
}
