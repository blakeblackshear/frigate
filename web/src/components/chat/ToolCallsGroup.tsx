import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LuChevronsUpDown } from "react-icons/lu";
import type { ToolCall } from "@/types/chat";

type ToolCallsGroupProps = {
  toolCalls: ToolCall[];
};

function normalizeName(name: string): string {
  return name
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function ToolCallsGroup({ toolCalls }: ToolCallsGroupProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, ToolCall[]>();
    for (const tc of toolCalls) {
      const existing = map.get(tc.name);
      if (existing) {
        existing.push(tc);
      } else {
        map.set(tc.name, [tc]);
      }
    }
    return map;
  }, [toolCalls]);

  if (toolCalls.length === 0) return null;

  return (
    <div className="flex flex-col items-start gap-2">
      {[...grouped.entries()].map(([name, calls]) => (
        <ToolCallRow key={name} name={name} calls={calls} />
      ))}
    </div>
  );
}

type ToolCallRowProps = {
  name: string;
  calls: ToolCall[];
};

function ToolCallRow({ name, calls }: ToolCallRowProps) {
  const { t } = useTranslation(["views/chat"]);
  const [open, setOpen] = useState(false);
  const displayName = normalizeName(name);
  const label =
    calls.length > 1 ? `${displayName} (\u00d7${calls.length})` : displayName;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3 text-sm text-secondary-foreground transition-colors hover:bg-muted/80">
        <span className="font-medium">{label}</span>
        <LuChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 space-y-3 rounded-xl bg-muted/40 px-4 py-3">
          {calls.map((tc, idx) => (
            <div
              key={idx}
              className={
                calls.length > 1
                  ? "space-y-1 border-l-2 border-border pl-3"
                  : "space-y-1"
              }
            >
              {tc.arguments && Object.keys(tc.arguments).length > 0 && (
                <div className="text-xs">
                  <div className="font-medium text-muted-foreground">
                    {t("arguments")}
                  </div>
                  <pre className="scrollbar-container mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-background/50 p-2 text-[10px]">
                    {JSON.stringify(tc.arguments, null, 2)}
                  </pre>
                </div>
              )}
              {tc.response && tc.response !== "" && (
                <div className="text-xs">
                  <div className="font-medium text-muted-foreground">
                    {t("response")}
                  </div>
                  <pre className="scrollbar-container mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-background/50 p-2 text-[10px]">
                    {tc.response}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
