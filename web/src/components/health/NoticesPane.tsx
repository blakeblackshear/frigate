import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaCircleCheck } from "react-icons/fa6";
import { LuPlay } from "react-icons/lu";
import useSWR from "swr";
import HealthProblemRow from "@/components/health/HealthProblemRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import TimeAgo from "@/components/dynamic/TimeAgo";
import { useNotices } from "@/hooks/use-notices";
import { resolveCameraName } from "@/hooks/use-camera-friendly-name";
import { useDateLocale } from "@/hooks/use-date-locale";
import { useTimezone } from "@/hooks/use-date-utils";
import useStats, { useAutoFrigateStats } from "@/hooks/use-stats";
import { useStreamChecks } from "@/hooks/use-stream-checks";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { releaseUrl } from "@/utils/versionUtil";
import { evaluateConfigHealth } from "@/utils/configHealth";
import { isStartupWindow } from "@/utils/health";
import { sortHealthProblems } from "@/utils/healthSort";
import {
  getStreamIssues,
  resolveRestreamSource,
  type StreamIssue,
} from "@/utils/streamIssues";
import type { StreamRole } from "@/types/cameraWizard";
import { inferCameraBrand } from "@/types/cameraWizard";
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
        source: "registry" as const,
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
  const { t } = useTranslation(["views/system", "views/settings"]);
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const stats = useAutoFrigateStats();
  const { notices, statsByKind, dismiss } = useNotices();
  const registryProblems = useNoticeProblems(notices, statsByKind, dismiss);
  const { potentialProblems } = useStats(stats);
  const { results, pending, running, total, run } = useStreamChecks(config);

  const liveProblems = useMemo<HealthProblem[]>(() => {
    if (!stats) {
      return [];
    }

    if (isStartupWindow(stats)) {
      return [
        {
          id: "live:startup",
          source: "live",
          severity: "info",
          text: t("health.notices.startupWindow"),
        },
      ];
    }

    return potentialProblems.map((problem, index) => ({
      id: `live:${index}:${problem.text}`,
      source: "live",
      severity: problem.severity,
      text: problem.text,
      link: problem.relevantLink?.replace(/^(?!\/)/, "/"),
    }));
  }, [stats, potentialProblems, t]);

  const configProblems = useMemo<HealthProblem[]>(
    () => (config ? evaluateConfigHealth(config, t) : []),
    [config, t],
  );

  const streamProblems = useMemo<HealthProblem[]>(() => {
    if (!config) {
      return [];
    }

    const problems: HealthProblem[] = pending.map((camera) => ({
      id: `stream:pending:${camera}`,
      source: "stream",
      severity: "info",
      pending: true,
      text: t("health.notices.checkingCamera", {
        camera: resolveCameraName(config, camera),
      }),
    }));

    if (!results) {
      return problems;
    }

    let checked = 0;
    let clean = 0;

    Object.entries(results.byCamera).forEach(([name, check]) => {
      const camera = config.cameras[name];
      if (!camera || !camera.enabled) {
        return;
      }
      checked += 1;
      const link = `/settings?page=cameraFfmpeg&camera=${encodeURIComponent(name)}`;
      let flagged = false;

      if (check.error) {
        problems.push({
          id: `stream:${name}:error`,
          source: "stream",
          severity: "error",
          scope: name,
          scopeIsCamera: true,
          text: t("health.notices.cameraProbeFailed", { error: check.error }),
          link,
        });
        return;
      }

      camera.ffmpeg.inputs.forEach((input, index) => {
        const result = check.streams[index];
        const streamNumber = index + 1;

        if (!result || !result.success) {
          flagged = true;
          problems.push({
            id: `stream:${name}:${index}:probe`,
            source: "stream",
            severity: "error",
            scope: name,
            scopeIsCamera: true,
            text: t("health.notices.streamProbeFailed", {
              index: streamNumber,
              error: (result?.error ?? "").split("\n")[0],
            }),
            link,
          });
          return;
        }

        const restream = resolveRestreamSource(
          input.path,
          config.go2rtc?.streams,
        );
        const url = restream?.url ?? input.path;
        // a restreamed input's probe describes go2rtc's output, and a missing
        // AAC track is fixed on the go2rtc stream, not on the camera
        const streamLink = restream
          ? "/settings?page=systemGo2rtcStreams"
          : link;
        const prefixKey = restream
          ? "health.notices.streamPrefixRestream"
          : "health.notices.streamPrefix";

        getStreamIssues(
          {
            url,
            roles: input.roles as StreamRole[],
            brand: inferCameraBrand(url),
            useFfmpeg: restream?.useFfmpeg,
            restream: !!restream,
            testResult: result,
          },
          t,
        )
          // good rows never show, and every wizard camera restreams by design
          .filter(
            (issue): issue is StreamIssue & { type: "warning" | "error" } =>
              issue.type !== "good" && issue.rule !== "restream",
          )
          .forEach((issue) => {
            flagged = true;
            problems.push({
              id: `stream:${name}:${index}:${issue.rule}`,
              source: "stream",
              severity: issue.type,
              scope: name,
              scopeIsCamera: true,
              text: t(prefixKey, {
                index: streamNumber,
                message: issue.message,
              }),
              link: streamLink,
            });
          });
      });

      if (!flagged) {
        clean += 1;
      }
    });

    if (checked > 0 && !running) {
      problems.push({
        id: "stream:summary",
        source: "stream",
        severity: "info",
        text: t("health.notices.streamSummary", { checked, clean }),
      });
    }

    return problems;
  }, [config, results, pending, running, t]);

  const summary = streamProblems.find(
    (problem) => problem.id === "stream:summary",
  );
  const problems = useMemo(
    () => [
      ...sortHealthProblems(
        [
          ...registryProblems,
          ...liveProblems,
          ...configProblems,
          ...streamProblems,
        ].filter((problem) => problem.id !== "stream:summary"),
      ),
      ...(summary ? [summary] : []),
    ],
    [registryProblems, liveProblems, configProblems, streamProblems, summary],
  );

  const loading = notices === undefined || !config;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-medium text-muted-foreground">
        {t("health.notices.title")}
      </div>
      <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
        <div className="mb-2 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={run}
            disabled={running || !config}
            aria-label={t("health.notices.runStreamChecks")}
          >
            <LuPlay className="mr-2 size-4" />
            {t("health.notices.runStreamChecks")}
          </Button>
          {running ? (
            <span className="text-sm text-muted-foreground">
              {t("health.notices.checking", {
                done: total - pending.length,
                total,
              })}
            </span>
          ) : (
            results && (
              <span className="text-sm text-muted-foreground">
                {t("health.notices.lastChecked")}{" "}
                <TimeAgo time={results.checkedAt * 1000} dense />
              </span>
            )
          )}
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : problems.length === 0 ? (
          <>
            <div className="flex items-center gap-2 px-1 py-2 text-sm">
              <FaCircleCheck className="size-4 text-success" />
              <span>{t("health.notices.empty")}</span>
            </div>
            {!results && (
              <div className="px-1 pb-1 pl-7 text-sm text-muted-foreground">
                {t("health.notices.runStreamChecksHint")}
              </div>
            )}
          </>
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
