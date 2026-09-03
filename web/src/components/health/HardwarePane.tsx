import { useTranslation } from "react-i18next";
import { FaCircleCheck } from "react-icons/fa6";
import { LuRefreshCw } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { ConnectionQualityIndicator } from "@/components/camera/ConnectionQualityIndicator";
import HardwareStatusRow from "@/components/health/HardwareStatusRow";
import { useHardwareHealth } from "@/hooks/use-hardware-health";
import type { HardwareRow } from "@/utils/health";

function Group({ title, rows }: { title: string; rows: HardwareRow[] }) {
  const { t } = useTranslation(["views/system"]);

  return (
    <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
      <div className="mb-5">{title}</div>
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
    </div>
  );
}

export default function HardwarePane() {
  const { t } = useTranslation(["views/system"]);
  const { rows, statsLoaded, recheck, rechecking } = useHardwareHealth();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="text-sm font-medium text-muted-foreground">
          {t("health.hardware.title")}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={recheck}
          disabled={rechecking}
          aria-label={t("health.hardware.recheck")}
        >
          {rechecking ? (
            <ActivityIndicator className="mr-2" size={16} />
          ) : (
            <LuRefreshCw className="mr-2 size-4" />
          )}
          {t("health.hardware.recheck")}
        </Button>
      </div>
      {!rows ? (
        <Skeleton className="h-40 w-full rounded-lg md:rounded-2xl" />
      ) : (
        <>
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
          <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
            <div className="mb-5">{t("health.hardware.cameraConnections")}</div>
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
          </div>
        </>
      )}
    </div>
  );
}
