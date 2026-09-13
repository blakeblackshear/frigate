import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaCircleCheck } from "react-icons/fa6";
import HealthProblemRow from "@/components/health/HealthProblemRow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useHealthProblems } from "@/hooks/use-health-problems";
import type { NoticeFilter } from "@/types/health";

type NoticesPaneProps = {
  filter: NoticeFilter;
};

export default function NoticesPane({ filter }: NoticesPaneProps) {
  const { t } = useTranslation(["views/system", "views/settings", "common"]);
  const { problems, dismissed, loading, clearDismissed } = useHealthProblems(
    t,
    filter.showDismissed,
  );
  const [confirmClear, setConfirmClear] = useState(false);

  const shown = useMemo(
    () =>
      problems.filter((problem) =>
        filter.severities.includes(problem.severity),
      ),
    [problems, filter.severities],
  );

  const shownDismissed = useMemo(
    () =>
      dismissed?.filter((problem) =>
        filter.severities.includes(problem.severity),
      ),
    [dismissed, filter.severities],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-md font-medium text-primary-variant">
        {t("health.notices.title")}
      </div>
      <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : problems.length === 0 ? (
          <div className="flex items-center gap-2 px-1 py-2 text-sm">
            <FaCircleCheck className="size-4 text-success" />
            <span>{t("health.notices.empty")}</span>
          </div>
        ) : shown.length === 0 ? (
          <div className="px-1 py-2 text-sm text-muted-foreground">
            {t("health.notices.noMatches")}
          </div>
        ) : (
          <div className="flex flex-col">
            {shown.map((problem) => (
              <HealthProblemRow key={problem.id} problem={problem} />
            ))}
          </div>
        )}
      </div>
      {filter.showDismissed && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              {t("health.notices.dismissedTitle")}
            </div>
            {dismissed && dismissed.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClear(true)}
              >
                {t("health.notices.clearDismissed")}
              </Button>
            )}
          </div>
          <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
            {shownDismissed === undefined ? (
              <Skeleton className="h-10 w-full" />
            ) : shownDismissed.length === 0 ? (
              <div className="px-1 py-2 text-sm text-muted-foreground">
                {t("health.notices.noneDismissed")}
              </div>
            ) : (
              <div className="flex flex-col">
                {shownDismissed.map((problem) => (
                  <HealthProblemRow key={problem.id} problem={problem} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("health.notices.clearDismissedTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("health.notices.clearDismissedDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={clearDismissed}
            >
              {t("health.notices.clearDismissed")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
