import { useCallback, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { useDetailStream } from "@/context/detail-stream-context";
import axios from "axios";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Trans, useTranslation } from "react-i18next";
import { LuInfo } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { isMobile } from "react-device-detect";
import { useIsAdmin } from "@/hooks/use-is-admin";

type Props = {
  className?: string;
};

export default function AnnotationOffsetSlider({ className }: Props) {
  const { annotationOffset, setAnnotationOffset, camera } = useDetailStream();
  const isAdmin = useIsAdmin();
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
        "flex flex-col gap-0.5",
        isMobile && "landscape:gap-3",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3",
          isMobile &&
            "landscape:flex-col landscape:items-start landscape:gap-4",
        )}
      >
        <div className="flex max-w-28 flex-row items-center gap-2 text-sm md:max-w-48">
          <span className="max-w-24 md:max-w-44">
            {t("trackingDetails.annotationSettings.offset.label")}:
          </span>
          <span className="text-primary-variant">{annotationOffset}</span>
        </div>
        <div className="w-full flex-1 landscape:flex">
          <Slider
            value={[annotationOffset]}
            min={-2500}
            max={2500}
            step={50}
            onValueChange={handleChange}
          />
        </div>
        <div className="flex items-center gap-2">
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
      <div
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          isMobile && "landscape:flex-col landscape:items-start",
        )}
      >
        <Trans ns="views/explore">
          trackingDetails.annotationSettings.offset.millisecondsToOffset
        </Trans>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="focus:outline-none"
              aria-label={t("trackingDetails.annotationSettings.offset.tips")}
            >
              <LuInfo className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm">
            {t("trackingDetails.annotationSettings.offset.tips")}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
