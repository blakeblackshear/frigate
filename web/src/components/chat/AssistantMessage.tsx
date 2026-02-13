import { useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type ToolCall = {
  name: string;
  arguments?: Record<string, unknown>;
  response?: string;
};

type AssistantMessageProps = {
  content: string;
  toolCalls?: ToolCall[];
};

export function AssistantMessage({
  content,
  toolCalls,
}: AssistantMessageProps) {
  const { t } = useTranslation(["views/chat"]);
  const [open, setOpen] = useState(false);
  const hasToolCalls = toolCalls && toolCalls.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <ReactMarkdown>{content}</ReactMarkdown>
      {hasToolCalls && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {open
                ? t("hideTools")
                : t("showTools", { count: toolCalls.length })}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 space-y-2 border-l-2 border-muted-foreground/30 pl-3">
              {toolCalls.map((tc, idx) => (
                <li key={idx} className="text-xs">
                  <span className="font-medium text-muted-foreground">
                    {tc.name}
                  </span>
                  {tc.response != null && tc.response !== "" && (
                    <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted/50 p-2 text-[10px]">
                      {tc.response}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
