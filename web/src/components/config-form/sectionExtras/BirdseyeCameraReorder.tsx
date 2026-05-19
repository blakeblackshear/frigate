import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast } from "sonner";
import useSWR from "swr";
import { Reorder, useDragControls } from "framer-motion";
import { LuCheck, LuGripVertical } from "react-icons/lu";
import { SplitCardRow } from "@/components/card/SettingsGroupCard";
import { CameraNameLabel } from "@/components/camera/FriendlyNameLabel";
import { FrigateConfig } from "@/types/frigateConfig";
import { cn } from "@/lib/utils";
import type { SectionRendererProps } from "./registry";

const SAVED_INDICATOR_MS = 1500;

type SaveStatus = "idle" | "saving" | "saved";

export default function BirdseyeCameraReorder({
  formContext,
}: SectionRendererProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const birdseyeCameras = useMemo(() => {
    if (!config) return [];
    return Object.keys(config.cameras)
      .filter(
        (name) =>
          config.cameras[name].enabled_in_config &&
          config.cameras[name].birdseye?.enabled !== false,
      )
      .sort((a, b) => {
        const orderA = config.cameras[a].birdseye?.order ?? 0;
        const orderB = config.cameras[b].birdseye?.order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
      });
  }, [config]);

  const [orderedCameras, setOrderedCameras] =
    useState<string[]>(birdseyeCameras);
  const orderedCamerasRef = useRef(orderedCameras);
  useEffect(() => {
    orderedCamerasRef.current = orderedCameras;
  }, [orderedCameras]);

  useEffect(() => {
    setOrderedCameras((prev) => {
      if (
        prev.length === birdseyeCameras.length &&
        prev.every((cam, i) => cam === birdseyeCameras[i])
      ) {
        return prev;
      }
      return birdseyeCameras;
    });
  }, [birdseyeCameras]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedResetTimerRef.current) {
        clearTimeout(savedResetTimerRef.current);
      }
    };
  }, []);

  const handleDragEnd = useCallback(async () => {
    const current = orderedCamerasRef.current;
    if (
      current.length === birdseyeCameras.length &&
      current.every((cam, i) => cam === birdseyeCameras[i])
    ) {
      return;
    }

    const cameraUpdates: Record<string, { birdseye: { order: number } }> = {};
    current.forEach((cam, i) => {
      cameraUpdates[cam] = { birdseye: { order: i * 10 } };
    });

    if (savedResetTimerRef.current) {
      clearTimeout(savedResetTimerRef.current);
      savedResetTimerRef.current = null;
    }
    setSaveStatus("saving");

    try {
      await axios.put("config/set", {
        requires_restart: 0,
        config_data: { cameras: cameraUpdates },
      });
      await updateConfig();
      setSaveStatus("saved");
      savedResetTimerRef.current = setTimeout(() => {
        setSaveStatus("idle");
        savedResetTimerRef.current = null;
      }, SAVED_INDICATOR_MS);
    } catch (error) {
      setOrderedCameras(birdseyeCameras);
      setSaveStatus("idle");
      const errorMessage =
        axios.isAxiosError(error) &&
        (error.response?.data?.message || error.response?.data?.detail)
          ? error.response?.data?.message || error.response?.data?.detail
          : t("toast.save.error.noMessage", { ns: "common" });

      toast.error(t("toast.save.error.title", { errorMessage, ns: "common" }), {
        position: "top-center",
      });
    }
  }, [birdseyeCameras, updateConfig, t]);

  if (formContext?.level && formContext.level !== "global") {
    return null;
  }

  if (!config || birdseyeCameras.length < 2) {
    return null;
  }

  return (
    <SplitCardRow
      label={t("birdseye.cameraOrder.label", { ns: "views/settings" })}
      description={t("birdseye.cameraOrder.description", {
        ns: "views/settings",
      })}
      content={
        <div className="max-w-md space-y-1.5">
          <Reorder.Group
            as="div"
            axis="y"
            values={orderedCameras}
            onReorder={setOrderedCameras}
            className="space-y-2 rounded-lg bg-secondary p-4"
          >
            {orderedCameras.map((camera) => (
              <BirdseyeCameraRow
                key={camera}
                camera={camera}
                onDragEnd={handleDragEnd}
              />
            ))}
          </Reorder.Group>
          <SaveStatusIndicator status={saveStatus} />
        </div>
      }
    />
  );
}

type SaveStatusIndicatorProps = {
  status: SaveStatus;
};

function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  const { t } = useTranslation(["views/settings"]);
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex h-4 items-center justify-start gap-1 text-xs transition-opacity duration-200",
        status === "idle" ? "opacity-0" : "opacity-100",
      )}
    >
      {status === "saving" && (
        <span className="text-muted-foreground">
          {t("birdseye.cameraOrder.saving")}
        </span>
      )}
      {status === "saved" && (
        <span className="flex items-center gap-1 text-success">
          <LuCheck className="size-3.5" />
          {t("birdseye.cameraOrder.saved")}
        </span>
      )}
    </div>
  );
}

type BirdseyeCameraRowProps = {
  camera: string;
  onDragEnd: () => void;
};

function BirdseyeCameraRow({ camera, onDragEnd }: BirdseyeCameraRowProps) {
  const { t } = useTranslation(["views/settings"]);
  const controls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={camera}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="flex flex-row items-center gap-1"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="-ml-1 cursor-grab touch-none rounded p-1 text-muted-foreground hover:text-primary active:cursor-grabbing"
        aria-label={t("birdseye.cameraOrder.reorderHandle")}
      >
        <LuGripVertical className="size-4" />
      </button>
      <CameraNameLabel camera={camera} />
    </Reorder.Item>
  );
}
