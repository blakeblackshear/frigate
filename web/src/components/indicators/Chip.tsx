import { cn } from "@/lib/utils";
import { LogSeverity } from "@/types/log";
import { ReactNode, useMemo } from "react";
import { isIOS } from "react-device-detect";
import { AnimatePresence, motion } from "framer-motion";

type ChipProps = {
  className?: string;
  children?: ReactNode | ReactNode[];
  in?: boolean;
  onClick?: () => void;
};

export default function Chip({
  className,
  children,
  in: inProp = true,
  onClick,
}: ChipProps) {
  return (
    <AnimatePresence>
      {inProp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={cn(
            "flex items-center rounded-2xl px-2 py-1.5",
            className,
            !isIOS && "z-10",
          )}
          onClick={(e) => {
            e.stopPropagation();

            if (onClick) {
              onClick();
            }
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type LogChipProps = {
  severity: LogSeverity;
  onClickSeverity?: () => void;
};
export function LogChip({ severity, onClickSeverity }: LogChipProps) {
  const severityClassName = useMemo(() => {
    switch (severity) {
      case "info":
        return "text-primary/60 bg-secondary hover:bg-secondary/60";
      case "warning":
        return "text-warning-foreground bg-warning hover:bg-warning/80";
      case "error":
        return "text-destructive-foreground bg-destructive hover:bg-destructive/80";
    }
  }, [severity]);

  return (
    <div className="min-w-16 lg:min-w-20">
      <span
        className={`rounded-md px-1 py-[1px] text-xs smart-capitalize ${onClickSeverity ? "cursor-pointer" : ""} ${severityClassName}`}
        onClick={(e) => {
          e.stopPropagation();

          if (onClickSeverity) {
            onClickSeverity();
          }
        }}
      >
        {severity}
      </span>
    </div>
  );
}
