import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
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
      className={
        isLeft
          ? "self-start rounded-lg bg-muted px-3 py-2"
          : "self-end rounded-lg bg-primary px-3 py-2 text-primary-foreground"
      }
    >
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto w-full justify-start gap-2 p-0 text-xs hover:bg-transparent"
          >
            {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span className="font-medium">
              {isLeft ? t("call") : t("result")} {normalizedName}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-2">
            {isLeft && args && Object.keys(args).length > 0 && (
              <div className="text-xs">
                <div className="font-medium text-muted-foreground">Arguments:</div>
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted/50 p-2 text-[10px]">
                  {JSON.stringify(args, null, 2)}
                </pre>
              </div>
            )}
            {!isLeft && response && response !== "" && (
              <div className="text-xs">
                <div className="font-medium opacity-80">Response:</div>
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-primary/20 p-2 text-[10px]">
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
