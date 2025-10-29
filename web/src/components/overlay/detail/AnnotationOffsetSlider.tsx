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

type Props = {
  className?: string;
};

export default function AnnotationOffsetSlider({ className }: Props) {
  const { annotationOffset, setAnnotationOffset, camera } = useDetailStream();
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
    <div className="flex flex-col gap-0.5">
      <div className={`flex items-center gap-3 ${className ?? ""}`}>
        <div className="flex flex-row gap-2 text-sm">
          {t("trackingDetails.annotationSettings.offset.label")}:
          <span className="text-primary-variant">{annotationOffset}</span>
        </div>
        <div className="flex-1">
          <Slider
            value={[annotationOffset]}
            min={-1500}
            max={1500}
            step={50}
            onValueChange={handleChange}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={reset}>
            {t("button.reset", { ns: "common" })}
          </Button>
          <Button size="sm" onClick={save} disabled={isSaving}>
            {isSaving
              ? t("button.saving", { ns: "common" })
              : t("button.save", { ns: "common" })}
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Trans ns="views/explore">
          trackingDetails.annotationSettings.offset.millisecondsToOffset
        </Trans>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="focus:outline-none"
              aria-label={t("trackingDetails.annotationSettings.offset.desc")}
            >
              <LuInfo className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 text-sm">
            {t("trackingDetails.annotationSettings.offset.desc")}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
