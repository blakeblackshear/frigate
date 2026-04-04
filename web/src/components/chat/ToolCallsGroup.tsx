import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { ToolCallBubble } from "@/components/chat/ToolCallBubble";
import type { ToolCall } from "@/types/chat";

type ToolCallsGroupProps = {
  toolCalls: ToolCall[];
};

export function ToolCallsGroup({ toolCalls }: ToolCallsGroupProps) {
  const { t } = useTranslation(["views/chat"]);
  const [open, setOpen] = useState(false);

  if (toolCalls.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50">
        {open ? (
          <LuChevronDown className="size-3" />
        ) : (
          <LuChevronRight className="size-3" />
        )}
        <span>
          {open ? t("hideTools") : t("showTools", { count: toolCalls.length })}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1 flex flex-col gap-2">
          {toolCalls.map((tc, tcIdx) => (
            <div key={tcIdx} className="flex flex-col gap-2">
              <ToolCallBubble
                name={tc.name}
                arguments={tc.arguments}
                side="left"
              />
              {tc.response && (
                <ToolCallBubble
                  name={tc.name}
                  response={tc.response}
                  side="right"
                />
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
