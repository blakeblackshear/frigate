import { LuChevronDown } from "react-icons/lu";

import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { FieldDelta } from "@/hooks/use-config-override";
import { cn } from "@/lib/utils";
import { useOverrideFieldLabel } from "./useOverrideFieldLabel";

type Props = {
  sectionPath: string;
  deltas: FieldDelta[];
  /** Translated label shown inside the badge */
  badgeLabel: string;
  /** Accessible label for the badge trigger */
  ariaLabel: string;
  /** Heading rendered at the top of the popover content */
  heading: string;
  /** Message shown when there are zero field deltas */
  noDeltasMessage: string;
  /** Border color class for the badge (defaults to selected) */
  borderColorClass?: string;
  className?: string;
};

/**
 * Shared popover layout for "this scope overrides these fields" badges
 * (e.g. profile overrides base config, camera overrides global config).
 */
export function OverrideDeltaPopover({
  sectionPath,
  deltas,
  badgeLabel,
  ariaLabel,
  heading,
  noDeltasMessage,
  borderColorClass,
  className,
}: Props) {
  const fieldLabel = useOverrideFieldLabel(sectionPath);
  const count = deltas.length;

  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Badge
          variant="secondary"
          className={cn(
            "cursor-pointer border-2 text-center text-xs text-primary-variant",
            borderColorClass ?? "border-selected",
            className,
          )}
          aria-label={ariaLabel}
        >
          <span>{badgeLabel}</span>
          <LuChevronDown className="ml-1 size-3" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[90vw] pr-0">
        <div className="flex flex-col gap-3">
          <div className="pr-4 text-xs text-primary-variant">
            {count > 0 ? heading : noDeltasMessage}
          </div>
          {count > 0 && (
            <ul className="scrollbar-container ml-5 flex max-h-[40dvh] list-disc flex-col gap-1 overflow-y-auto pr-4 text-xs">
              {deltas.map((delta) => (
                <li key={delta.fieldPath}>{fieldLabel(delta.fieldPath)}</li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
