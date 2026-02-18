import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

type ToolCallBubbleProps = {
  name: string;
  arguments?: Record<string, unknown>;
  response?: string;
  side: "left" | "right";
};

export function ToolCallBubble({
  name,
  arguments: args,
  response,
  side,
}: ToolCallBubbleProps) {
  const { t } = useTranslation(["views/chat"]);
  const [open, setOpen] = useState(false);
  const isLeft = side === "left";
  const normalizedName = name
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2",
        isLeft
          ? "self-start bg-muted"
          : "self-end bg-primary text-primary-foreground",
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-auto w-full min-w-0 justify-start gap-2 whitespace-normal p-0 text-left text-xs hover:bg-transparent",
              !isLeft && "hover:text-primary-foreground",
            )}
          >
            {open ? (
              <ChevronDown size={12} className="shrink-0" />
            ) : (
              <ChevronRight size={12} className="shrink-0" />
            )}
            <span className="break-words font-medium">
              {isLeft ? t("call") : t("result")} {normalizedName}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2">
            {isLeft && args && Object.keys(args).length > 0 && (
              <div className="text-xs">
                <div className="font-medium text-muted-foreground">
                  {t("arguments")}
                </div>
                <pre className="scrollbar-container mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 text-[10px]">
                  {JSON.stringify(args, null, 2)}
                </pre>
              </div>
            )}
            {!isLeft && response && response !== "" && (
              <div className="text-xs">
                <div className="font-medium opacity-80">{t("response")}</div>
                <pre className="scrollbar-container mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-primary/20 p-2 text-[10px]">
                  {response}
                </pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
