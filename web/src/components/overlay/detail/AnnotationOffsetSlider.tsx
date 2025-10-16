import { useCallback, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useDetailStream } from "@/context/detail-stream-context";
import axios from "axios";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
        t("objectLifecycle.annotationSettings.offset.toast.success", {
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
      className={`absolute bottom-0 left-0 right-0 z-30 flex items-center gap-3 bg-background p-3 ${className ?? ""}`}
      style={{ pointerEvents: "auto" }}
    >
      <div className="w-56 text-sm">
        Annotation offset (ms): {annotationOffset}
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
          Reset
        </Button>
        <Button size="sm" onClick={save} disabled={isSaving}>
          {isSaving
            ? t("button.saving", { ns: "common" })
            : t("button.save", { ns: "common" })}
        </Button>
      </div>
    </div>
  );
}
