import { CombinedStorageGraph } from "@/components/graph/CombinedStorageGraph";
import { StorageGraph } from "@/components/graph/StorageGraph";
import { FrigateStats } from "@/types/stats";
import { useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useSWR from "swr";
import { CiCircleAlert } from "react-icons/ci";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  useFormattedTimestamp,
  useTimeFormat,
  useTimezone,
} from "@/hooks/use-date-utils";
import { RecordingsSummary } from "@/types/review";
import { useTranslation } from "react-i18next";
import { TZDate } from "react-day-picker";
import { Link } from "react-router-dom";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { LuExternalLink } from "react-icons/lu";
import { FaExclamationTriangle } from "react-icons/fa";

type CameraStorage = {
  [key: string]: {
    bandwidth: number;
    usage: number;
    usage_percent: number;
  };
};

type StorageMetricsProps = {
  setLastUpdated: (last: number) => void;
};
export default function StorageMetrics({
  setLastUpdated,
}: StorageMetricsProps) {
  const { data: cameraStorage } = useSWR<CameraStorage>("recordings/storage");
  const { data: stats } = useSWR<FrigateStats>("stats");
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const { t } = useTranslation(["views/system"]);
  const timezone = useTimezone(config);
  const { getLocaleDocUrl } = useDocDomain();

  const totalStorage = useMemo(() => {
    if (!cameraStorage || !stats) {
      return undefined;
    }

    const totalStorage = {
      used: stats.service.storage["/media/frigate/recordings"]["used"],
      camera: 0,
      total: stats.service.storage["/media/frigate/recordings"]["total"],
    };

    Object.values(cameraStorage).forEach(
      (cam) => (totalStorage.camera += cam.usage),
    );
    return totalStorage;
  }, [cameraStorage, stats]);

  useEffect(() => {
    if (totalStorage) {
      setLastUpdated(Math.floor(Date.now() / 1000));
    }
  }, [totalStorage, setLastUpdated]);

  // recordings summary

  const { data: recordingsSummary } = useSWR<RecordingsSummary>([
    "recordings/summary",
    {
      timezone: timezone,
    },
  ]);

  const earliestDate = useMemo(() => {
    const keys = Object.keys(recordingsSummary || {});
    return keys.length
      ? new TZDate(keys[0] + "T00:00:00", timezone).getTime() / 1000
      : null;
  }, [recordingsSummary, timezone]);

  const timeFormat = useTimeFormat(config);
  const format = useMemo(() => {
    return t(`time.formattedTimestampMonthDayYear.${timeFormat}`, {
      ns: "common",
    });
  }, [t, timeFormat]);

  const formattedEarliestDate = useFormattedTimestamp(
    earliestDate || 0,
    format,
    timezone,
  );

  const shmFrameLifetime = useMemo(() => {
    if (!stats || !config) {
      return undefined;
    }

    const shmFrameCount = stats.service.storage["/dev/shm"]?.shm_frame_count;

    if (!shmFrameCount || shmFrameCount <= 0) {
      return undefined;
    }

    let maxCameraFps = 0;

    for (const [name, camStats] of Object.entries(stats.cameras)) {
      if (config.cameras[name]?.enabled && camStats.camera_fps > 0) {
        maxCameraFps = Math.max(maxCameraFps, camStats.camera_fps);
      }
    }

    if (maxCameraFps === 0) {
      return undefined;
    }

    return {
      frames: shmFrameCount,
      lifetime: Math.round((shmFrameCount / maxCameraFps) * 10) / 10,
    };
  }, [stats, config]);

  if (!cameraStorage || !stats || !totalStorage || !config) {
    return;
  }

  return (
    <div className="scrollbar-container mt-4 flex size-full flex-col overflow-y-auto">
      <div className="text-sm font-medium text-muted-foreground">
        {t("storage.overview")}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="flex-col rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
          <div className="mb-5 flex flex-row items-center justify-between">
            {t("storage.recordings.title")}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="focus:outline-none"
                  aria-label={t(
                    "storage.cameraStorage.unusedStorageInformation",
                  )}
                >
                  <CiCircleAlert
                    className="size-5"
                    aria-label={t(
                      "storage.cameraStorage.unusedStorageInformation",
                    )}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">{t("storage.recordings.tips")}</div>
              </PopoverContent>
            </Popover>
          </div>
          <StorageGraph
            graphId="general-recordings"
            used={totalStorage.camera}
            total={totalStorage.total}
          />
          {earliestDate && (
            <div className="mt-2 text-xs text-primary-variant">
              <span className="font-medium">
                {t("storage.recordings.earliestRecording")}
              </span>{" "}
              {formattedEarliestDate}
            </div>
          )}
        </div>
        <div className="flex-col rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
          <div className="mb-5">/tmp/cache</div>
          <StorageGraph
            graphId="general-cache"
            used={stats.service.storage["/tmp/cache"]["used"]}
            total={stats.service.storage["/tmp/cache"]["total"]}
          />
        </div>
        <div className="flex-col rounded-lg bg-background_alt p-2.5 md:rounded-2xl">
          <div className="mb-5 flex flex-row items-center justify-between">
            /dev/shm
            <div className="flex flex-row items-center gap-2">
              {shmFrameLifetime && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="focus:outline-none"
                      aria-label={t("storage.shm.frameLifetime.title")}
                    >
                      <CiCircleAlert
                        className="size-5"
                        aria-label={t("storage.shm.frameLifetime.title")}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      {t("storage.shm.frameLifetime.description", {
                        frames: shmFrameLifetime.frames,
                        lifetime: shmFrameLifetime.lifetime,
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              {stats.service.storage["/dev/shm"]["total"] <
                (stats.service.storage["/dev/shm"]["min_shm"] ?? 0) && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className="focus:outline-none"
                      aria-label={t("storage.shm.title")}
                    >
                      <FaExclamationTriangle
                        className="size-5 text-danger"
                        aria-label={t("storage.shm.title")}
                      />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-2">
                      {t("storage.shm.warning", {
                        total: stats.service.storage["/dev/shm"]["total"],
                        min_shm: stats.service.storage["/dev/shm"]["min_shm"],
                      })}
                      <div className="mt-2 flex items-center text-primary">
                        <Link
                          to={getLocaleDocUrl(
                            "frigate/installation#calculating-required-shm-size",
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline"
                        >
                          {t("readTheDocumentation", { ns: "common" })}
                          <LuExternalLink className="ml-2 inline-flex size-3" />
                        </Link>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          <StorageGraph
            graphId="general-shared-memory"
            used={stats.service.storage["/dev/shm"]["used"]}
            total={stats.service.storage["/dev/shm"]["total"]}
          />
        </div>
      </div>
      <div className="mt-4 text-sm font-medium text-muted-foreground">
        {t("storage.cameraStorage.title")}
      </div>
      <div className="mt-4 bg-background_alt p-2.5 md:rounded-2xl">
        <CombinedStorageGraph
          graphId={`single-storage`}
          cameraStorage={cameraStorage}
          totalStorage={totalStorage}
        />
      </div>
    </div>
  );
}
