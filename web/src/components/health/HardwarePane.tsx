import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FaCircleCheck } from "react-icons/fa6";
import { LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import useSWR from "swr";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import TimeAgo from "@/components/dynamic/TimeAgo";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { ConnectionQualityIndicator } from "@/components/camera/ConnectionQualityIndicator";
import HardwareStatusRow from "@/components/health/HardwareStatusRow";
import { useHardwareHealth } from "@/hooks/use-hardware-health";
import { useHealthChecks } from "@/hooks/use-health-checks";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { HardwareRow } from "@/utils/health";
import { streamHealth } from "@/utils/streamHealth";

function Card({
  title,
  className,
  action,
  subtitle,
  children,
}: {
  title: string;
  className?: string;
  /** an icon button right after the title */
  action?: React.ReactNode;
  /** a muted line under the title */
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-lg bg-background_alt p-2.5 pb-5 md:rounded-2xl",
        className,
      )}
    >
      <div className="mb-5 flex flex-col">
        <div className="flex items-center gap-3">
          <span>{title}</span>
          {action}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function InlineAction({
  label,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0 text-muted-foreground hover:text-primary"
          aria-label={label}
          disabled={busy || disabled}
          onClick={onClick}
        >
          {busy ? (
            <ActivityIndicator className="size-3.5" size={14} />
          ) : (
            <LuRefreshCw className="size-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent>{label}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}

function Group({ title, rows }: { title: string; rows: HardwareRow[] }) {
  const { t } = useTranslation(["views/system"]);

  return (
    <Card title={title}>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          {t("health.hardware.nothingConfigured")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <HardwareStatusRow key={row.id} row={row} />
          ))}
        </div>
      )}
    </Card>
  );
}

/** Stream checks live here: the check sits next to its result. */
function StreamsGroup() {
  const { t } = useTranslation(["views/system", "views/settings"]);
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const { stream } = useHealthChecks();
  const summary = useMemo(
    () => (config ? streamHealth(config, stream.results, t) : undefined),
    [config, stream.results, t],
  );
  const row: HardwareRow | undefined = useMemo(() => {
    if (stream.running || !summary || !stream.results) {
      return undefined;
    }
    const flagged = summary.checked - summary.clean;
    return {
      id: "streams",
      state: flagged > 0 ? "warning" : "ok",
      label: t("health.hardware.streamsChecked", { count: summary.checked }),
      detail:
        flagged > 0
          ? t("health.hardware.streamsFlagged", { count: flagged })
          : t("health.hardware.streamsClean"),
    };
  }, [stream.running, stream.results, summary, t]);

  return (
    <Card
      title={t("health.hardware.cameraStreams")}
      action={
        <InlineAction
          label={
            stream.results
              ? t("health.hardware.runAgain")
              : t("health.hardware.runStreamChecks")
          }
          busy={stream.running}
          disabled={!config}
          onClick={() => stream.run()}
        />
      }
      subtitle={
        stream.running
          ? t("health.hardware.streamsChecking", {
              done: stream.total - stream.pending.length,
              total: stream.total,
            })
          : stream.results && (
              <>
                {t("health.hardware.checked")}{" "}
                <TimeAgo time={stream.results.checkedAt * 1000} dense />
              </>
            )
      }
    >
      <div className="flex flex-col gap-3 text-sm" data-testid="camera-streams">
        {row ? (
          <HardwareStatusRow row={row} />
        ) : (
          <HardwareStatusRow
            row={{
              id: "streams",
              state: "unknown",
              label: t("health.hardware.streamsNotChecked"),
            }}
          />
        )}
      </div>
    </Card>
  );
}

function HardwareHeading() {
  const { t } = useTranslation(["views/system"]);
  const { hardware } = useHealthChecks();

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3">
        <div className="text-md font-medium text-primary-variant">
          {t("health.hardware.title")}
        </div>
        <InlineAction
          label={t("health.hardware.recheck")}
          busy={hardware.rechecking}
          onClick={() => hardware.recheck()}
        />
      </div>
      {hardware.rechecking ? (
        <div className="text-xs text-muted-foreground">
          {t("health.hardware.probing")}
        </div>
      ) : (
        hardware.probedAt && (
          <div className="text-xs text-muted-foreground">
            {t("health.hardware.probed")}{" "}
            <TimeAgo time={hardware.probedAt * 1000} dense />
          </div>
        )
      )}
    </div>
  );
}

export default function HardwarePane() {
  const { t } = useTranslation(["views/system"]);
  const { rows, statsLoaded } = useHardwareHealth();

  return (
    <div className="flex flex-col gap-4">
      <HardwareHeading />
      {!rows ? (
        <Skeleton className="h-40 w-full rounded-lg md:rounded-2xl" />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Group
                title={t("health.hardware.objectDetection")}
                rows={rows.detection}
              />
              <Group
                title={t("health.hardware.hardwareAcceleration")}
                rows={rows.hwaccel}
              />
              <Group
                title={t("health.hardware.enrichments.title")}
                rows={rows.enrichments}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <StreamsGroup />
              <Card title={t("health.hardware.cameraConnections")}>
                {!statsLoaded ? (
                  <Skeleton className="h-10 w-full" />
                ) : rows.cameras.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FaCircleCheck className="size-4 text-success" />
                    {t("health.hardware.allCamerasExcellent")}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {rows.cameras.map((cell) => (
                      <div
                        key={cell.camera}
                        className="flex items-center gap-2 text-sm"
                        data-testid={`camera-connection-${cell.camera}`}
                      >
                        <ConnectionQualityIndicator
                          quality={cell.quality}
                          expectedFps={cell.expectedFps}
                          reconnects={cell.reconnects}
                          stalls={cell.stalls}
                        />
                        <CameraNameLabel
                          camera={cell.camera}
                          className="smart-capitalize"
                        />
                        <span className="text-muted-foreground">
                          {t("health.hardware.fps", {
                            camera: cell.cameraFps.toFixed(1),
                            expected: cell.expectedFps,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
