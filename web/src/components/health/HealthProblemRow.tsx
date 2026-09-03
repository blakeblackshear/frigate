import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaTriangleExclamation } from "react-icons/fa6";
import {
  LuExternalLink,
  LuInfo,
  LuSlidersHorizontal,
  LuX,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import type { HealthProblem } from "@/types/health";

type HealthProblemRowProps = {
  problem: HealthProblem;
};

export default function HealthProblemRow({ problem }: HealthProblemRowProps) {
  const { t } = useTranslation(["views/system"]);

  return (
    <div
      className="flex items-start gap-2 border-b border-border px-1 py-2 text-sm last:border-b-0"
      data-testid={`health-problem-${problem.id}`}
      data-severity={problem.severity}
    >
      <div className="mt-0.5 flex shrink-0">
        {problem.severity === "error" && <LuX className="size-4 text-danger" />}
        {problem.severity === "warning" && (
          <FaTriangleExclamation className="size-4 text-yellow-500" />
        )}
        {problem.severity === "info" && (
          <LuInfo className="size-4 text-selected" />
        )}
      </div>
      {problem.scope && (
        <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground smart-capitalize">
          {problem.scopeIsCamera ? (
            <CameraNameLabel camera={problem.scope} />
          ) : (
            problem.scope
          )}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div>{problem.text}</div>
        {problem.meta && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {problem.meta}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
        {problem.onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={problem.onDismiss}
            aria-label={t("health.notices.dismiss")}
          >
            {t("health.notices.dismiss")}
          </Button>
        )}
        {problem.link && (
          <Link
            to={problem.link}
            aria-label={t("health.notices.openSettings")}
            className="hover:text-primary"
          >
            <LuSlidersHorizontal className="size-4" />
          </Link>
        )}
        {problem.externalLink && (
          <a
            href={problem.externalLink}
            target="_blank"
            rel="noreferrer"
            aria-label={t("health.notices.openLink")}
            className="hover:text-primary"
          >
            <LuExternalLink className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
}
