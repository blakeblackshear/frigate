import { useCallback, useMemo } from "react";
import axios from "axios";
import type { TFunction } from "i18next";
import useSWR from "swr";
import { useDateLocale } from "@/hooks/use-date-locale";
import { useTimezone } from "@/hooks/use-date-utils";
import { useHealthChecks } from "@/hooks/use-health-checks";
import { useNotices } from "@/hooks/use-notices";
import { evaluateConfigHealth } from "@/utils/configHealth";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { sortHealthProblems } from "@/utils/healthSort";
import { streamHealth } from "@/utils/streamHealth";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { HealthProblem } from "@/types/health";
import type { DismissedCheck, Notice } from "@/types/notice";

const EXTERNAL_LINK = /^https?:\/\//;

type HealthProblems = {
  /** undismissed rows, most severe first */
  problems: HealthProblem[];
  /** dismissed rows, most recently dismissed first; undefined until loaded */
  dismissed?: HealthProblem[];
  loading: boolean;
  /** delete every dismissed row, so each can show again */
  clearDismissed: () => Promise<void>;
};

/**
 * Every row of the Health tab's Notices list: registry notices plus the config
 * and stream checks the browser builds. The Notices pane and the status bar
 * both read it, so they always agree. `t` only fills in the text; row ids and
 * counts never depend on it.
 */
export function useHealthProblems(
  t: TFunction,
  showDismissed = false,
): HealthProblems {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const timezone = useTimezone(config);
  const locale = useDateLocale();
  const {
    notices,
    dismissed: dismissedNotices,
    dismiss,
    mutateDismissed,
  } = useNotices(showDismissed);
  const { data: dismissedChecks, mutate: mutateDismissedChecks } = useSWR<
    DismissedCheck[]
  >("notices/dismissed_checks");
  const {
    stream: { results },
  } = useHealthChecks();

  const dismissCheck = useCallback(
    async (id: string) => {
      await axios.post(`notices/${id}/dismiss`);
      mutateDismissedChecks();
    },
    [mutateDismissedChecks],
  );

  const clearDismissed = useCallback(async () => {
    await axios.delete("notices/dismissed");
    mutateDismissed();
    mutateDismissedChecks();
  }, [mutateDismissed, mutateDismissedChecks]);

  const formatTime = useCallback(
    (timestamp: number) =>
      formatUnixTimestampToDateTime(timestamp, {
        timezone,
        date_format: "MMM d, h:mm a",
        locale,
      }),
    [timezone, locale],
  );

  const noticeRow = useCallback(
    (notice: Notice): HealthProblem => {
      const link = notice.link ?? undefined;
      const external = link !== undefined && EXTERNAL_LINK.test(link);
      const isCamera = notice.category === "camera";

      return {
        id: `notice:${notice.id}`,
        source: "registry",
        severity: notice.severity,
        // only a camera scope is a name; other scopes are ids like a release
        scope: isCamera ? (notice.scope ?? undefined) : undefined,
        scopeIsCamera: isCamera,
        // replace keeps backend params out of i18next's own option names
        text: t(`health.notices.kinds.${notice.kind}`, {
          ns: "views/system",
          replace: notice.params,
          count: notice.count,
        }),
        meta:
          notice.dismissed_at === null
            ? t("health.notices.firstSeen", {
                ns: "views/system",
                time: formatTime(notice.first_seen),
                count: notice.count,
              })
            : t("health.notices.dismissedAt", {
                ns: "views/system",
                time: formatTime(notice.dismissed_at),
              }),
        link: external ? undefined : link,
        externalLink: external ? link : undefined,
        onDismiss:
          notice.dismissed_at === null ? () => dismiss(notice.id) : undefined,
      };
    },
    [dismiss, formatTime, t],
  );

  const checks = useMemo<HealthProblem[]>(
    () =>
      config
        ? [
            ...evaluateConfigHealth(config, t),
            ...streamHealth(config, results, t).problems,
          ]
        : [],
    [config, results, t],
  );

  const dismissedAt = useMemo(
    () =>
      new Map(
        (dismissedChecks ?? []).map((check) => [check.id, check.dismissed_at]),
      ),
    [dismissedChecks],
  );

  const problems = useMemo(
    () =>
      sortHealthProblems([
        ...(notices ?? []).map(noticeRow),
        ...checks
          .filter((check) => !dismissedAt.has(check.id))
          .map((check) => ({
            ...check,
            onDismiss: () => dismissCheck(check.id),
          })),
      ]),
    [notices, noticeRow, checks, dismissedAt, dismissCheck],
  );

  const dismissed = useMemo(() => {
    if (!showDismissed || dismissedNotices === undefined) {
      return undefined;
    }

    const rows = [
      ...dismissedNotices.map((notice) => ({
        at: notice.dismissed_at ?? 0,
        row: noticeRow(notice),
      })),
      ...checks.flatMap((check) => {
        const at = dismissedAt.get(check.id);

        return at === undefined
          ? []
          : [
              {
                at,
                row: {
                  ...check,
                  meta: t("health.notices.dismissedAt", {
                    ns: "views/system",
                    time: formatTime(at),
                  }),
                },
              },
            ];
      }),
    ];

    return rows.sort((a, b) => b.at - a.at).map(({ row }) => row);
  }, [
    showDismissed,
    dismissedNotices,
    noticeRow,
    checks,
    dismissedAt,
    formatTime,
    t,
  ]);

  const loading =
    notices === undefined || dismissedChecks === undefined || !config;

  return { problems, dismissed, loading, clearDismissed };
}
