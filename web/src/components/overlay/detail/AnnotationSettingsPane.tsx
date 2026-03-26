import { Event } from "@/types/event";
import { FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { useCallback, useState } from "react";
import { LuExternalLink, LuMinus, LuPlus } from "react-icons/lu";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Trans, useTranslation } from "react-i18next";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  ANNOTATION_OFFSET_MAX,
  ANNOTATION_OFFSET_MIN,
  ANNOTATION_OFFSET_STEP,
} from "@/lib/const";

type AnnotationSettingsPaneProps = {
  event: Event;
  annotationOffset: number;
  setAnnotationOffset: React.Dispatch<React.SetStateAction<number>>;
};
export function AnnotationSettingsPane({
  event,
  annotationOffset,
  setAnnotationOffset,
}: AnnotationSettingsPaneProps) {
  const { t } = useTranslation(["views/explore"]);
  const isAdmin = useIsAdmin();
  const { getLocaleDocUrl } = useDocDomain();

  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const [isLoading, setIsLoading] = useState(false);

  const handleSliderChange = useCallback(
    (values: number[]) => {
      if (!values || values.length === 0) return;
      setAnnotationOffset(values[0]);
    },
    [setAnnotationOffset],
  );

  const stepOffset = useCallback(
    (delta: number) => {
      setAnnotationOffset((prev) => {
        const next = prev + delta;
        return Math.max(
          ANNOTATION_OFFSET_MIN,
          Math.min(ANNOTATION_OFFSET_MAX, next),
        );
      });
    },
    [setAnnotationOffset],
  );

  const reset = useCallback(() => {
    setAnnotationOffset(0);
  }, [setAnnotationOffset]);

  const saveToConfig = useCallback(async () => {
    if (!config || !event) return;

    setIsLoading(true);
    try {
      const res = await axios.put(
        `config/set?cameras.${event.camera}.detect.annotation_offset=${annotationOffset}`,
        { requires_restart: 0 },
      );
      if (res.status === 200) {
        toast.success(
          t("trackingDetails.annotationSettings.offset.toast.success", {
            camera: event.camera,
          }),
          { position: "top-center" },
        );
        updateConfig();
      } else {
        toast.error(
          t("toast.save.error.title", {
            errorMessage: res.statusText,
            ns: "common",
          }),
          { position: "top-center" },
        );
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data?.detail ||
        "Unknown error";
      toast.error(t("toast.save.error.title", { errorMessage, ns: "common" }), {
        position: "top-center",
      });
    } finally {
      setIsLoading(false);
    }
  }, [annotationOffset, config, event, updateConfig, t]);

  return (
    <div className="p-4">
      <div className="text-md mb-2">
        {t("trackingDetails.annotationSettings.title")}
      </div>

      <Separator className="mb-4 flex bg-secondary" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium">
            {t("trackingDetails.annotationSettings.offset.label")}
          </div>
          <div className="text-sm text-muted-foreground">
            <Trans ns="views/explore">
              trackingDetails.annotationSettings.offset.millisecondsToOffset
            </Trans>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            aria-label="-50ms"
            onClick={() => stepOffset(-ANNOTATION_OFFSET_STEP)}
            disabled={annotationOffset <= ANNOTATION_OFFSET_MIN}
          >
            <LuMinus className="size-4" />
          </Button>
          <Slider
            value={[annotationOffset]}
            min={ANNOTATION_OFFSET_MIN}
            max={ANNOTATION_OFFSET_MAX}
            step={ANNOTATION_OFFSET_STEP}
            onValueChange={handleSliderChange}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8 shrink-0"
            aria-label="+50ms"
            onClick={() => stepOffset(ANNOTATION_OFFSET_STEP)}
            disabled={annotationOffset >= ANNOTATION_OFFSET_MAX}
          >
            <LuPlus className="size-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-mono text-sm tabular-nums text-primary-variant">
            {annotationOffset > 0 ? "+" : ""}
            {annotationOffset}ms
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={reset}>
            {t("button.reset", { ns: "common" })}
          </Button>
        </div>

        <div className="text-sm text-secondary-foreground">
          {t("trackingDetails.annotationSettings.offset.tips")}
          <div className="mt-2 flex items-center text-primary-variant">
            <Link
              to={getLocaleDocUrl(
                "troubleshooting/dummy-camera#annotation-offset",
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

        {isAdmin && (
          <>
            <Separator className="bg-secondary" />
            <Button
              variant="select"
              aria-label={t("button.save", { ns: "common" })}
              disabled={isLoading}
              onClick={saveToConfig}
            >
              {isLoading ? (
                <div className="flex flex-row items-center gap-2">
                  <ActivityIndicator className="size-4" />
                  <span>{t("button.saving", { ns: "common" })}</span>
                </div>
              ) : (
                t("button.save", { ns: "common" })
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
