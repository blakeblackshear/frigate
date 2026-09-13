import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useHealthProblems } from "@/hooks/use-health-problems";

/** The count of undismissed Notices rows, shown before the status bar's health text. */
export default function StatusBarNotices() {
  const { t } = useTranslation(["views/system"]);
  const { problems, loading } = useHealthProblems(t);

  if (loading || problems.length === 0) {
    return null;
  }

  return (
    <>
      <span className="text-sm text-muted-foreground">•</span>
      <Link
        to="/system#health"
        className="whitespace-nowrap text-sm hover:underline"
      >
        {t("stats.systemNotices", { count: problems.length })}
      </Link>
    </>
  );
}
