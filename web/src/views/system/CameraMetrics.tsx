import { useFrigateStats } from "@/api/ws";
import { CameraLineGraph } from "@/components/graph/LineGraph";
import CameraInfoDialog from "@/components/overlay/CameraInfoDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FrigateConfig } from "@/types/frigateConfig";
import { FrigateStats } from "@/types/stats";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MdInfo } from "react-icons/md";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { resolveCameraName } from "@/hooks/use-camera-friendly-name";

type CameraMetricsProps = {
  lastUpdated: number;
  setLastUpdated: (last: number) => void;
};
export default function CameraMetrics({
  lastUpdated,
  setLastUpdated,
}: CameraMetricsProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { t } = useTranslation(["views/system"]);
  // camera info dialog

  const getCameraName = useCallback(
    (cameraId: string) => resolveCameraName(config, cameraId),
    [config],
  );

  const [showCameraInfoDialog, setShowCameraInfoDialog] = useState(false);
  const [probeCameraName, setProbeCameraName] = useState<string>();

  // stats

  const { data: initialStats } = useSWR<FrigateStats[]>(
    [
      "stats/history",
      {
        keys: "cpu_usages,cameras,camera_fps,detection_fps,skipped_fps,service",
      },
    ],
    {
      revalidateOnFocus: false,
    },
  );

  const [statsHistory, setStatsHistory] = useState<FrigateStats[]>([]);
  const updatedStats = useFrigateStats();

  useEffect(() => {
    if (initialStats == undefined || initialStats.length == 0) {
      return;
    }

    if (statsHistory.length == 0) {
      setStatsHistory(initialStats);
      return;
    }

    if (!updatedStats) {
      return;
    }

    if (updatedStats.service.last_updated > lastUpdated) {
      setStatsHistory([...statsHistory.slice(1), updatedStats]);
      setLastUpdated(Date.now() / 1000);
    }
  }, [initialStats, updatedStats, statsHistory, lastUpdated, setLastUpdated]);

  // timestamps

  const updateTimes = useMemo(
    () => statsHistory.map((stats) => stats.service.last_updated),
    [statsHistory],
  );

  // stats data

  const overallFpsSeries = useMemo(() => {
    if (!statsHistory) {
      return [];
    }

    const series: {
      [key: string]: { name: string; data: { x: number; y: number }[] };
    } = {};

    series["overall_fps"] = {
      name: t("cameras.label.overallFramesPerSecond"),
      data: [],
    };
    series["overall_dps"] = {
      name: t("cameras.label.overallDetectionsPerSecond"),
      data: [],
    };
    series["overall_skipped_dps"] = {
      name: t("cameras.label.overallSkippedDetectionsPerSecond"),
      data: [],
    };

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      series["overall_fps"].data.push({
        x: statsIdx,
        y: stats.camera_fps,
      });

      series["overall_dps"].data.push({
        x: statsIdx,
        y: stats.detection_fps,
      });

      series["overall_skipped_dps"].data.push({
        x: statsIdx,
        y: stats.skipped_fps,
      });
    });
    return Object.values(series);
  }, [statsHistory, t]);

  const cameraCpuSeries = useMemo(() => {
    if (!statsHistory || statsHistory.length == 0) {
      return {};
    }

    const series: {
      [cam: string]: {
        [key: string]: { name: string; data: { x: number; y: string }[] };
      };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.cameras).forEach(([key, camStats]) => {
        if (!config?.cameras[key].enabled) {
          return;
        }

        if (!(key in series)) {
          const camName = getCameraName(key);
          series[key] = {};
          series[key]["ffmpeg"] = {
            name: t("cameras.label.cameraFfmpeg", { camName: camName }),
            data: [],
          };
          series[key]["capture"] = {
            name: t("cameras.label.cameraCapture", { camName: camName }),
            data: [],
          };
          series[key]["detect"] = {
            name: t("cameras.label.cameraDetect", { camName: camName }),
            data: [],
          };
        }

        series[key]["ffmpeg"].data.push({
          x: statsIdx,
          y: stats.cpu_usages[camStats.ffmpeg_pid.toString()]?.cpu ?? 0.0,
        });
        series[key]["capture"].data.push({
          x: statsIdx,
          y: stats.cpu_usages[camStats.capture_pid?.toString()]?.cpu ?? 0,
        });
        series[key]["detect"].data.push({
          x: statsIdx,
          y: stats.cpu_usages[camStats.pid?.toString()]?.cpu,
        });
      });
    });
    return series;
  }, [config, getCameraName, statsHistory, t]);

  const cameraFpsSeries = useMemo(() => {
    if (!statsHistory) {
      return {};
    }

    const series: {
      [cam: string]: {
        [key: string]: { name: string; data: { x: number; y: number }[] };
      };
    } = {};

    statsHistory.forEach((stats, statsIdx) => {
      if (!stats) {
        return;
      }

      Object.entries(stats.cameras).forEach(([key, camStats]) => {
        if (!(key in series)) {
          const camName = getCameraName(key);
          series[key] = {};
          series[key]["fps"] = {
            name: t("cameras.label.cameraFramesPerSecond", {
              camName: camName,
            }),
            data: [],
          };
          series[key]["det"] = {
            name: t("cameras.label.cameraDetectionsPerSecond", {
              camName: camName,
            }),
            data: [],
          };
          series[key]["skip"] = {
            name: t("cameras.label.cameraSkippedDetectionsPerSecond", {
              camName: camName,
            }),
            data: [],
          };
        }

        series[key]["fps"].data.push({
          x: statsIdx,
          y: camStats.camera_fps,
        });
        series[key]["det"].data.push({
          x: statsIdx,
          y: camStats.detection_fps,
        });
        series[key]["skip"].data.push({
          x: statsIdx,
          y: camStats.skipped_fps,
        });
      });
    });
    return series;
  }, [getCameraName, statsHistory, t]);

  useEffect(() => {
    if (!showCameraInfoDialog) {
      setProbeCameraName("");
    }
  }, [showCameraInfoDialog]);

  return (
    <div className="scrollbar-container mt-4 flex size-full flex-col gap-3 overflow-y-auto">
      <div className="text-sm font-medium text-muted-foreground">
        {t("cameras.overview")}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3">
        {statsHistory.length != 0 ? (
          <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
            <div className="mb-5">{t("cameras.framesAndDetections")}</div>
            <CameraLineGraph
              graphId="overall-stats"
              unit=""
              dataLabels={["camera", "detect", "skipped"]}
              updateTimes={updateTimes}
              data={overallFpsSeries}
            />
          </div>
        ) : (
          <Skeleton className="h-32 w-full rounded-lg md:rounded-2xl" />
        )}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {config &&
          Object.values(config.cameras).map((camera) => {
            if (camera.enabled) {
              return (
                <>
                  {probeCameraName == camera.name && (
                    <CameraInfoDialog
                      key={camera.name}
                      camera={camera}
                      showCameraInfoDialog={showCameraInfoDialog}
                      setShowCameraInfoDialog={setShowCameraInfoDialog}
                    />
                  )}
                  <div className="flex w-full flex-col gap-3">
                    <div className="flex flex-row items-center justify-between">
                      <div className="text-sm font-medium text-muted-foreground smart-capitalize">
                        <CameraNameLabel camera={camera} />
                      </div>
                      <Tooltip>
                        <TooltipTrigger>
                          <MdInfo
                            className="size-5 cursor-pointer text-muted-foreground"
                            onClick={() => {
                              setShowCameraInfoDialog(true);
                              setProbeCameraName(camera.name);
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("cameras.info.tips.title")}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div
                      key={camera.name}
                      className="grid gap-2 sm:grid-cols-2"
                    >
                      {Object.keys(cameraCpuSeries).includes(camera.name) ? (
                        <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                          <div className="mb-5">CPU</div>
                          <CameraLineGraph
                            graphId={`${camera.name}-cpu`}
                            unit="%"
                            dataLabels={["ffmpeg", "capture", "detect"]}
                            updateTimes={updateTimes}
                            data={Object.values(
                              cameraCpuSeries[camera.name] || {},
                            )}
                          />
                        </div>
                      ) : (
                        <Skeleton className="aspect-video size-full" />
                      )}
                      {Object.keys(cameraFpsSeries).includes(camera.name) ? (
                        <div className="rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
                          <div className="mb-5">
                            {t("cameras.framesAndDetections")}
                          </div>
                          <CameraLineGraph
                            graphId={`${camera.name}-dps`}
                            unit=""
                            dataLabels={["camera", "detect", "skipped"]}
                            updateTimes={updateTimes}
                            data={Object.values(
                              cameraFpsSeries[camera.name] || {},
                            )}
                          />
                        </div>
                      ) : (
                        <Skeleton className="aspect-video size-full" />
                      )}
                    </div>
                  </div>
                </>
              );
            }

            return null;
          })}
      </div>
    </div>
  );
}
