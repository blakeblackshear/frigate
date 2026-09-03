import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaCircleCheck } from "react-icons/fa6";
import useSWR from "swr";
import HealthProblemRow from "@/components/health/HealthProblemRow";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotices } from "@/hooks/use-notices";
import { useDateLocale } from "@/hooks/use-date-locale";
import { useTimezone } from "@/hooks/use-date-utils";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { releaseUrl } from "@/utils/versionUtil";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { HealthProblem } from "@/types/health";
import type { Notice, NoticeKind, NoticeStats } from "@/types/notice";

const SETTINGS_LINK_BY_KIND: Partial<
  Record<NoticeKind, (scope: string | null) => string>
> = {
  ffmpeg_crash_loop: (scope) => `/settings?page=cameraFfmpeg&camera=${scope}`,
  retention_unmet: () => "/system#storage",
  detector_stuck: () => "/system#general",
};

const EXTERNAL_LINK_BY_KIND: Partial<
  Record<NoticeKind, (params: Notice["params"]) => string | undefined>
> = {
  update_available: (params) =>
    typeof params.version === "string" ? releaseUrl(params.version) : undefined,
};

function useNoticeProblems(
  notices: Notice[] | undefined,
  statsByKind: Partial<Record<NoticeKind, NoticeStats>>,
  dismiss: (id: string) => Promise<void>,
): HealthProblem[] {
  const { t } = useTranslation(["views/system"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useTimezone(config);
  const locale = useDateLocale();

  return useMemo(() => {
    if (!notices) {
      return [];
    }

    const formatTime = (timestamp: number, date_format: string) =>
      formatUnixTimestampToDateTime(timestamp, {
        timezone,
        date_format,
        locale,
      });

    return notices.map((notice) => {
      const stats = statsByKind[notice.kind];
      const seen = formatTime(notice.first_seen, "MMM d, h:mm a");
      let meta: string;

      if (notice.mode === "event") {
        meta = t("health.notices.firstSeen", {
          time: seen,
          times: notice.count,
        });
      } else if (stats && stats.occurrences > 1) {
        meta = t("health.notices.sinceWithCount", {
          time: seen,
          times: stats.occurrences,
          firstSeen: formatTime(stats.first_seen, "MMM d"),
        });
      } else {
        meta = t("health.notices.since", { time: seen });
      }

      const link = SETTINGS_LINK_BY_KIND[notice.kind];
      const external = EXTERNAL_LINK_BY_KIND[notice.kind];

      return {
        id: `notice:${notice.id}`,
        severity: notice.severity,
        scope: notice.scope ?? undefined,
        scopeIsCamera: notice.category === "camera",
        // replace keeps backend params out of i18next's own option names
        text: t(`health.notices.kinds.${notice.kind}`, {
          replace: notice.params,
        }),
        meta,
        link: link ? link(notice.scope) : undefined,
        externalLink: external ? external(notice.params) : undefined,
        onDismiss:
          notice.mode === "event" ? () => dismiss(notice.id) : undefined,
      };
    });
  }, [notices, statsByKind, dismiss, t, timezone, locale]);
}

export default function NoticesPane() {
  const { t } = useTranslation(["views/system"]);
  const { notices, statsByKind, dismiss } = useNotices();
  const problems = useNoticeProblems(notices, statsByKind, dismiss);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-md font-medium text-primary-variant">
          {t("health.notices.title")}
        </div>
      </div>
      <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
        {notices === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : problems.length === 0 ? (
          <div className="flex items-center gap-2 px-1 py-2 text-sm">
            <FaCircleCheck className="size-4 text-success" />
            <span>{t("health.notices.empty")}</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {problems.map((problem) => (
              <HealthProblemRow key={problem.id} problem={problem} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
