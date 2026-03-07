import { useCallback, useState } from "react";
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
import { isMobile } from "react-device-detect";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { Link } from "react-router-dom";

const OFFSET_MIN = -2500;
const OFFSET_MAX = 2500;
const OFFSET_STEP = 50;

type Props = {
  className?: string;
};

export default function AnnotationOffsetSlider({ className }: Props) {
  const { annotationOffset, setAnnotationOffset, camera } = useDetailStream();
  const isAdmin = useIsAdmin();
  const { getLocaleDocUrl } = useDocDomain();
  const { mutate } = useSWRConfig();
  const { t } = useTranslation(["views/explore"]);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = useCallback(
    (values: number[]) => {
      if (!values || values.length === 0) return;
      const valueMs = values[0];
      setAnnotationOffset(valueMs);
    },
    [setAnnotationOffset],
  );

  const stepOffset = useCallback(
    (delta: number) => {
      setAnnotationOffset((prev) => {
        const next = prev + delta;
        return Math.max(OFFSET_MIN, Math.min(OFFSET_MAX, next));
      });
    },
    [setAnnotationOffset],
  );

  const reset = useCallback(() => {
    setAnnotationOffset(0);
  }, [setAnnotationOffset]);

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
          onClick={() => stepOffset(-OFFSET_STEP)}
          disabled={annotationOffset <= OFFSET_MIN}
        >
          <LuMinus className="size-4" />
        </Button>
        <div className="w-full flex-1 landscape:flex">
          <Slider
            value={[annotationOffset]}
            min={OFFSET_MIN}
            max={OFFSET_MAX}
            step={OFFSET_STEP}
            onValueChange={handleChange}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          aria-label="+50ms"
          onClick={() => stepOffset(OFFSET_STEP)}
          disabled={annotationOffset >= OFFSET_MAX}
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
