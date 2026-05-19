import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LuBrain, LuChevronDown, LuChevronRight } from "react-icons/lu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReasoningBubbleProps = {
  /** The accumulated reasoning text from the model. */
  reasoning: string;
  /**
   * Whether the assistant has begun producing the user-facing answer.
   * While false the reasoning is still streaming and we keep the panel
   * open with a "Thinking…" label. Once true, the panel auto-collapses
   * so the answer is the primary focus, but stays expandable.
   */
  answerStarted: boolean;
};

export function ReasoningBubble({
  reasoning,
  answerStarted,
}: ReasoningBubbleProps) {
  const { t } = useTranslation(["views/chat"]);
  // Open while the model is still mid-thought (no answer tokens yet);
  // once the answer begins, collapse on its own but let the user reopen.
  const [open, setOpen] = useState(true);
  const userInteractedRef = useRef(false);
  const lastAutoState = useRef(true);

  useEffect(() => {
    if (userInteractedRef.current) return;
    const desired = !answerStarted;
    if (desired !== lastAutoState.current) {
      lastAutoState.current = desired;
      setOpen(desired);
    }
  }, [answerStarted]);

  const handleOpenChange = (next: boolean) => {
    userInteractedRef.current = true;
    setOpen(next);
  };

  const label = !answerStarted
    ? t("reasoning.active")
    : open
      ? t("reasoning.hide")
      : t("reasoning.show");

  return (
    <div className="self-start rounded-2xl bg-muted/60 px-3 py-2 text-muted-foreground">
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto w-full min-w-0 justify-start gap-2 whitespace-normal p-0 text-left text-xs hover:bg-transparent"
          >
            <LuBrain
              className={cn(
                "size-3 shrink-0",
                !answerStarted && "animate-pulse",
              )}
            />
            <span className="break-words font-medium">{label}</span>
            {answerStarted &&
              (open ? (
                <LuChevronDown className="ml-auto size-3 shrink-0" />
              ) : (
                <LuChevronRight className="ml-auto size-3 shrink-0" />
              ))}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="scrollbar-container mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/50 p-2 font-sans text-xs leading-relaxed">
            {reasoning}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
