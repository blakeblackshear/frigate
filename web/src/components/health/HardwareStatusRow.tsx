import { FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";
import { LuCircleHelp, LuX } from "react-icons/lu";
import { cn } from "@/lib/utils";
import type { HardwareRow } from "@/utils/health";

const MESSAGE_COLOR: Record<HardwareRow["state"], string> = {
  ok: "text-success",
  warning: "text-yellow-500",
  error: "text-danger",
  unknown: "text-muted-foreground",
};

export default function HardwareStatusRow({ row }: { row: HardwareRow }) {
  return (
    <div
      className="flex items-start gap-2 text-sm"
      data-testid={`hardware-row-${row.id}`}
      data-state={row.state}
    >
      <div className="mt-0.5 flex shrink-0">
        {row.state === "ok" && (
          <FaCircleCheck className="size-4 text-success" />
        )}
        {row.state === "warning" && (
          <FaTriangleExclamation className="size-4 text-yellow-500" />
        )}
        {row.state === "error" && <LuX className="size-4 text-danger" />}
        {row.state === "unknown" && (
          <LuCircleHelp className="size-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <div>
          <span>{row.label}</span>
          {row.detail && (
            <span className="ml-2 text-muted-foreground">{row.detail}</span>
          )}
        </div>
        {row.message && (
          <div className={cn("mt-0.5", MESSAGE_COLOR[row.state])}>
            {row.message}
          </div>
        )}
      </div>
    </div>
  );
}
