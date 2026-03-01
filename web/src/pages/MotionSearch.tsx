import { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useTimezone } from "@/hooks/use-date-utils";
import MotionSearchView from "@/views/motion-search/MotionSearchView";
import {
  getBeginningOfDayTimestamp,
  getEndOfDayTimestamp,
} from "@/utils/dateUtil";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import ActivityIndicator from "@/components/indicators/activity-indicator";

export default function MotionSearch() {
  const { t } = useTranslation(["views/motionSearch"]);

  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const timezone = useTimezone(config);

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  // Get allowed cameras
  const allowedCameras = useAllowedCameras();

  const cameras = useMemo(() => {
    if (!config?.cameras) return [];
    return Object.keys(config.cameras).filter((cam) =>
      allowedCameras.includes(cam),
    );
  }, [config?.cameras, allowedCameras]);

  // Selected camera state
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [cameraLocked, setCameraLocked] = useState(false);

  useSearchEffect("camera", (camera: string) => {
    if (cameras.length > 0 && cameras.includes(camera)) {
      setSelectedCamera(camera);
      setCameraLocked(true);
    }
    return false;
  });

  // Initialize with first camera when available (only if not set by camera param)
  useEffect(() => {
    if (cameras.length === 0) return;
    if (!selectedCamera) {
      setSelectedCamera(cameras[0]);
    }
  }, [cameras, selectedCamera]);

  // Time range state - default to last 24 hours
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);

  const timeRange = useMemo(() => {
    if (selectedDay) {
      return {
        after: getBeginningOfDayTimestamp(new Date(selectedDay)),
        before: getEndOfDayTimestamp(new Date(selectedDay)),
      };
    }
    // Default to last 24 hours
    const now = Date.now() / 1000;
    return {
      after: now - 86400,
      before: now,
    };
  }, [selectedDay]);

  const handleCameraSelect = useCallback((camera: string) => {
    setSelectedCamera(camera);
  }, []);

  const handleDaySelect = useCallback((day: Date | undefined) => {
    if (day == undefined) {
      setSelectedDay(undefined);
      return;
    }

    const normalizedDay = new Date(day);
    normalizedDay.setHours(0, 0, 0, 0);
    setSelectedDay(normalizedDay);
  }, []);

  if (!config || cameras.length === 0) {
    return (
      <div className="flex size-full items-center justify-center">
        <ActivityIndicator />
      </div>
    );
  }

  return (
    <MotionSearchView
      config={config}
      cameras={cameras}
      selectedCamera={selectedCamera ?? null}
      onCameraSelect={handleCameraSelect}
      cameraLocked={cameraLocked}
      selectedDay={selectedDay}
      onDaySelect={handleDaySelect}
      timeRange={timeRange}
      timezone={timezone}
    />
  );
}
