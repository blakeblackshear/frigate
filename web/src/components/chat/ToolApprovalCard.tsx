import { useTranslation } from "react-i18next";
import { LuShieldAlert, LuCheck, LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatToolName } from "@/utils/chatUtil";
import type { PendingToolCall, ToolDecision } from "@/types/chat";

type ToolApprovalCardProps = {
  toolCall: PendingToolCall;
  decision?: ToolDecision;
  onApprove: (id: string) => void;
  onAlwaysAllow: (id: string, name: string) => void;
  onReject: (id: string) => void;
};

/**
 * Prompt shown when the assistant wants to run a state-changing tool.
 * Renders the call's arguments and approve / always allow / reject actions;
 * once decided it collapses into a status line.
 */
export function ToolApprovalCard({
  toolCall,
  decision,
  onApprove,
  onAlwaysAllow,
  onReject,
}: ToolApprovalCardProps) {
  const { t } = useTranslation(["views/chat"]);
  const displayName = formatToolName(toolCall.name);
  const hasArguments = Object.keys(toolCall.arguments ?? {}).length > 0;

  return (
    <div
      className="flex w-full max-w-[85%] flex-col gap-3 self-start rounded-xl border border-border bg-muted px-4 py-3"
      role="group"
      aria-label={t("approval.title", { tool: displayName })}
    >
      <div className="flex items-start gap-2">
        <LuShieldAlert className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-sm font-medium">
            {t("approval.title", { tool: displayName })}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("approval.desc")}
          </span>
        </div>
      </div>
      {hasArguments && (
        <pre className="scrollbar-container max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-background/50 p-2 text-[10px]">
          {JSON.stringify(toolCall.arguments, null, 2)}
        </pre>
      )}
      {decision ? (
        <div
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            decision === "approve" ? "text-success" : "text-destructive",
          )}
        >
          {decision === "approve" ? (
            <LuCheck className="size-3.5" />
          ) : (
            <LuX className="size-3.5" />
          )}
          {decision === "approve"
            ? t("approval.approved")
            : t("approval.rejected")}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="select"
            onClick={() => onApprove(toolCall.id)}
          >
            {t("approval.approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAlwaysAllow(toolCall.id, toolCall.name)}
          >
            {t("approval.always_allow")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => onReject(toolCall.id)}
          >
            {t("approval.reject")}
          </Button>
        </div>
      )}
    </div>
  );
}
