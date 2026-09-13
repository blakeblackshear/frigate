import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaTriangleExclamation } from "react-icons/fa6";
import {
  LuExternalLink,
  LuInfo,
  LuSlidersHorizontal,
  LuX,
} from "react-icons/lu";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useDocDomain } from "@/hooks/use-doc-domain";
import type { HealthProblem } from "@/types/health";

type HealthProblemRowProps = {
  problem: HealthProblem;
};

const ICON_BUTTON_CLASS =
  "size-6 shrink-0 text-muted-foreground hover:text-primary";

function RowAction({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipPortal>
        <TooltipContent>{label}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}

export default function HealthProblemRow({ problem }: HealthProblemRowProps) {
  const { t } = useTranslation(["views/system", "common"]);
  const { getLocaleDocUrl } = useDocDomain();
  const hasDetails = problem.scope || problem.meta;
  const hasActions =
    problem.link ||
    problem.docLink ||
    problem.externalLink ||
    problem.onDismiss;

  return (
    <div
      className="flex items-center gap-2 border-b border-border px-1 py-2 text-sm last:border-b-0"
      data-testid={`health-problem-${problem.id}`}
      data-severity={problem.severity}
    >
      <div className="flex shrink-0 self-start pt-0.5">
        {problem.pending ? (
          <ActivityIndicator className="" size={16} />
        ) : (
          <>
            {problem.severity === "error" && (
              <LuX className="size-4 text-danger" />
            )}
            {problem.severity === "warning" && (
              <FaTriangleExclamation className="size-4 text-yellow-500" />
            )}
            {problem.severity === "info" && (
              <LuInfo className="size-4 text-selected" />
            )}
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div>{problem.text}</div>
        {hasDetails && (
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {problem.scope && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-primary-variant">
                {problem.scopeIsCamera ? (
                  <CameraNameLabel camera={problem.scope} />
                ) : (
                  problem.scope
                )}
              </span>
            )}
            {problem.meta && <span>{problem.meta}</span>}
          </div>
        )}
      </div>
      {hasActions && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {problem.link && (
            <RowAction label={t("health.notices.openSettings")}>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className={ICON_BUTTON_CLASS}
              >
                <Link
                  to={problem.link}
                  aria-label={t("health.notices.openSettings")}
                >
                  <LuSlidersHorizontal className="size-3.5" />
                </Link>
              </Button>
            </RowAction>
          )}
          {problem.docLink && (
            <RowAction label={t("readTheDocumentation", { ns: "common" })}>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className={ICON_BUTTON_CLASS}
              >
                <a
                  href={getLocaleDocUrl(problem.docLink)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("readTheDocumentation", { ns: "common" })}
                >
                  <LuExternalLink className="size-3.5" />
                </a>
              </Button>
            </RowAction>
          )}
          {problem.externalLink && (
            <RowAction label={t("health.notices.openLink")}>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className={ICON_BUTTON_CLASS}
              >
                <a
                  href={problem.externalLink}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("health.notices.openLink")}
                >
                  <LuExternalLink className="size-3.5" />
                </a>
              </Button>
            </RowAction>
          )}
          {problem.onDismiss && (
            <RowAction label={t("health.notices.dismiss")}>
              <Button
                variant="ghost"
                size="icon"
                className={ICON_BUTTON_CLASS}
                aria-label={t("health.notices.dismiss")}
                onClick={problem.onDismiss}
              >
                <LuX className="size-3.5" />
              </Button>
            </RowAction>
          )}
        </div>
      )}
    </div>
  );
}
