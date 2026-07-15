import { useCallback, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { throttle } from "lodash";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { useDetailStream } from "@/context/detail-stream-context";
import axios from "axios";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
import { LuExternalLink, LuInfo, LuMinus, LuPlus } from "react-icons/lu";
import { cn } from "@/lib/utils";
import {
  ANNOTATION_OFFSET_MAX,
  ANNOTATION_OFFSET_MIN,
  ANNOTATION_OFFSET_STEP,
} from "@/lib/const";
import { isMobile } from "react-device-detect";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { Link } from "react-router-dom";

const SLIDER_DRAG_THROTTLE_MS = 80;

type Props = {
  className?: string;
  // Optional side-effect invoked atomically with setAnnotationOffset (inside
  // flushSync) so callers like the timeline panel can re-seek the video in the
  // same React commit as the offset state update — preventing a one-frame
  // overlay mismatch where annotationOffset has changed but currentTime has not.
  onApplyOffset?: (newOffset: number) => void;
};

export default function AnnotationOffsetSlider({
  className,
  onApplyOffset,
}: Props) {
  const { annotationOffset, setAnnotationOffset, camera } = useDetailStream();
  const isAdmin = useIsAdmin();
  const { getLocaleDocUrl } = useDocDomain();
  const { mutate } = useSWRConfig();
  const { t } = useTranslation(["views/explore"]);
  const [isSaving, setIsSaving] = useState(false);

  const applyOffset = useCallback(
    (newOffset: number) => {
      flushSync(() => {
        setAnnotationOffset(newOffset);
        onApplyOffset?.(newOffset);
      });
    },
    [setAnnotationOffset, onApplyOffset],
  );

  const throttledApplyOffset = useMemo(
    () =>
      throttle(applyOffset, SLIDER_DRAG_THROTTLE_MS, {
        leading: true,
        trailing: true,
      }),
    [applyOffset],
  );

  useEffect(() => () => throttledApplyOffset.cancel(), [throttledApplyOffset]);

  const handleChange = useCallback(
    (values: number[]) => {
      if (!values || values.length === 0) return;
      throttledApplyOffset(values[0]);
    },
    [throttledApplyOffset],
  );

  const handleCommit = useCallback(
    (values: number[]) => {
      if (!values || values.length === 0) return;
      // Ensure the final value lands even if it would otherwise be discarded
      // by the trailing edge of the throttle window.
      throttledApplyOffset.cancel();
      applyOffset(values[0]);
    },
    [throttledApplyOffset, applyOffset],
  );

  const stepOffset = useCallback(
    (delta: number) => {
      const next = Math.max(
        ANNOTATION_OFFSET_MIN,
        Math.min(ANNOTATION_OFFSET_MAX, annotationOffset + delta),
      );
      throttledApplyOffset.cancel();
      applyOffset(next);
    },
    [annotationOffset, applyOffset, throttledApplyOffset],
  );

  const reset = useCallback(() => {
    throttledApplyOffset.cancel();
    applyOffset(0);
  }, [applyOffset, throttledApplyOffset]);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      // save value in milliseconds to config
      await axios.put(
        `config/set?cameras.${camera}.detect.annotation_offset=${annotationOffset}`,
        { requires_restart: 0 },
      );

      toast.success(
        t("trackingDetails.annotationSettings.offset.toast.success", {
          camera,
        }),
        { position: "top-center" },
      );

      // refresh config
      await mutate("config");
    } catch (e: unknown) {
      const err = e as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        err?.response?.data?.message || err?.message || "Unknown error";
      toast.error(t("toast.save.error.title", { errorMessage, ns: "common" }), {
        position: "top-center",
      });
    } finally {
      setIsSaving(false);
    }
  }, [annotationOffset, camera, mutate, t]);

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5",
        isMobile && "landscape:gap-3",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm">
        <span>{t("trackingDetails.annotationSettings.offset.label")}:</span>
        <span className="font-mono tabular-nums text-primary-variant">
          {annotationOffset > 0 ? "+" : ""}
          {annotationOffset}ms
        </span>
      </div>
      <div
        className={cn(
          "flex items-center gap-3",
          isMobile &&
            "landscape:flex-col landscape:items-start landscape:gap-4",
        )}
      >
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
        <div className="w-full flex-1 landscape:flex">
          <Slider
            value={[annotationOffset]}
            min={ANNOTATION_OFFSET_MIN}
            max={ANNOTATION_OFFSET_MAX}
            step={ANNOTATION_OFFSET_STEP}
            onValueChange={handleChange}
            onValueCommit={handleCommit}
          />
        </div>
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
      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Trans ns="views/explore">
          trackingDetails.annotationSettings.offset.millisecondsToOffset
        </Trans>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="mt-px shrink-0 focus:outline-none"
              aria-label={t("trackingDetails.annotationSettings.offset.tips")}
            >
              <LuInfo className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm">
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
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={reset}>
          {t("button.reset", { ns: "common" })}
        </Button>
        {isAdmin && (
          <Button size="sm" onClick={save} disabled={isSaving}>
            {isSaving
              ? t("button.saving", { ns: "common" })
              : t("button.save", { ns: "common" })}
          </Button>
        )}
      </div>
    </div>
  );
}
