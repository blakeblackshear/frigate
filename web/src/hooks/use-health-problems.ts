import { useCallback, useMemo } from "react";
import axios from "axios";
import type { TFunction } from "i18next";
import useSWR from "swr";
import { useDateLocale } from "@/hooks/use-date-locale";
import { useTimezone } from "@/hooks/use-date-utils";
import { useHealthChecks } from "@/hooks/use-health-checks";
import { hiddenAt, useNotices } from "@/hooks/use-notices";
import { evaluateConfigHealth } from "@/utils/configHealth";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { sortHealthProblems } from "@/utils/healthSort";
import { streamHealth } from "@/utils/streamHealth";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { HealthProblem } from "@/types/health";
import type { MutedCheck, Notice } from "@/types/notice";

const EXTERNAL_LINK = /^https?:\/\//;

type HealthProblems = {
  /** shown rows, most severe first */
  problems: HealthProblem[];
  /** acknowledged and muted rows, most recently hidden first; undefined until loaded */
  hidden?: HealthProblem[];
  loading: boolean;
  /** show every hidden row again */
  unhideAll: () => Promise<void>;
};

/**
 * Every row of the Health tab's Notices list: registry notices plus the config
 * and stream checks the browser builds. The Notices pane and the status bar
 * both read it, so they always agree. `t` only fills in the text; row ids and
 * counts never depend on it.
 */
export function useHealthProblems(
  t: TFunction,
  showHidden = false,
): HealthProblems {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const timezone = useTimezone(config);
  const locale = useDateLocale();
  const {
    notices,
    hidden: hiddenNotices,
    acknowledge,
    mute,
    unhide,
    mutateHidden,
  } = useNotices(showHidden);
  const { data: mutedChecks, mutate: mutateMutedChecks } = useSWR<MutedCheck[]>(
    "notices/muted_checks",
  );
  const {
    stream: { results },
  } = useHealthChecks();

  const muteCheck = useCallback(
    async (id: string) => {
      await axios.post(`notices/${id}/mute`);
      mutateMutedChecks();
    },
    [mutateMutedChecks],
  );

  const unmuteCheck = useCallback(
    async (id: string) => {
      await axios.delete(`notices/${id}/hidden`);
      mutateMutedChecks();
    },
    [mutateMutedChecks],
  );

  const unhideAll = useCallback(async () => {
    await axios.delete("notices/hidden");
    mutateHidden();
    mutateMutedChecks();
  }, [mutateHidden, mutateMutedChecks]);

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
          notice.muted_at !== null
            ? t("health.notices.mutedAt", {
                ns: "views/system",
                time: formatTime(notice.muted_at),
              })
            : notice.acknowledged_at !== null
              ? t("health.notices.acknowledgedAt", {
                  ns: "views/system",
                  time: formatTime(notice.acknowledged_at),
                })
              : t("health.notices.firstSeen", {
                  ns: "views/system",
                  time: formatTime(notice.first_seen),
                  count: notice.count,
                }),
        link: external ? undefined : link,
        externalLink: external ? link : undefined,
        ...(hiddenAt(notice) > 0
          ? {
              hidden: notice.muted_at !== null ? "muted" : "acknowledged",
              onUnhide: () => unhide(notice.id),
            }
          : {
              onAcknowledge: notice.acknowledgeable
                ? () => acknowledge(notice.id)
                : undefined,
              onMute: () => mute(notice.id),
            }),
      };
    },
    [acknowledge, mute, unhide, formatTime, t],
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

  const mutedAt = useMemo(
    () =>
      new Map((mutedChecks ?? []).map((check) => [check.id, check.muted_at])),
    [mutedChecks],
  );

  const problems = useMemo(
    () =>
      sortHealthProblems([
        ...(notices ?? []).map(noticeRow),
        ...checks
          .filter((check) => !mutedAt.has(check.id))
          .map((check) => ({
            ...check,
            onMute: () => muteCheck(check.id),
          })),
      ]),
    [notices, noticeRow, checks, mutedAt, muteCheck],
  );

  const hidden = useMemo(() => {
    if (!showHidden || hiddenNotices === undefined) {
      return undefined;
    }

    const rows = [
      ...hiddenNotices.map((notice) => ({
        at: hiddenAt(notice),
        row: noticeRow(notice),
      })),
      ...checks.flatMap((check) => {
        const at = mutedAt.get(check.id);

        return at === undefined
          ? []
          : [
              {
                at,
                row: {
                  ...check,
                  meta: t("health.notices.mutedAt", {
                    ns: "views/system",
                    time: formatTime(at),
                  }),
                  hidden: "muted" as const,
                  onUnhide: () => unmuteCheck(check.id),
                },
              },
            ];
      }),
    ];

    return rows.sort((a, b) => b.at - a.at).map(({ row }) => row);
  }, [
    showHidden,
    hiddenNotices,
    noticeRow,
    checks,
    mutedAt,
    formatTime,
    unmuteCheck,
    t,
  ]);

  const loading = notices === undefined || mutedChecks === undefined || !config;

  return { problems, hidden, loading, unhideAll };
}
