import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { HwaccelRecommendation } from "@/types/hardware";
import axios from "axios";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSWR from "swr";

const AUTO = "auto";
const NONE = "none";

const HWACCEL_PRESETS = [
  { value: "preset-vaapi", key: "vaapi" },
  { value: "preset-nvidia", key: "cuda" },
  { value: "preset-intel-qsv-h264", key: "qsv" },
  { value: "preset-rkmpp", key: "rkmpp" },
  { value: "preset-rpi-64-h264", key: "rpi" },
  { value: "preset-jetson-h264", key: "jetson" },
] as const;

type SetupHwAccelProps = {
  detectorHardwareKey?: string;
  // saved reports whether a config write happened, so the wizard knows
  // whether finishing requires a restart
  onNext: (saved: boolean) => void;
  onBack: () => void;
  onSkip: () => void;
};

export default function SetupHwAccel({
  detectorHardwareKey,
  onNext,
  onBack,
  onSkip,
}: SetupHwAccelProps) {
  const { t } = useTranslation(["views/setup"]);

  const {
    data: recommendation,
    isLoading,
    error: recommendError,
  } = useSWR<HwaccelRecommendation>(
    detectorHardwareKey
      ? `hardware/hwaccel?detector=${encodeURIComponent(detectorHardwareKey)}`
      : "hardware/hwaccel",
    { revalidateOnFocus: false },
  );

  const [selected, setSelected] = useState<string>(AUTO);
  const [saving, setSaving] = useState(false);

  const derived = recommendation?.preset ?? "";

  const handleSave = useCallback(async () => {
    // Auto with nothing derived writes nothing: the config default of "auto"
    // stays in place and the backend decides at startup
    if (selected === AUTO && !derived) {
      onNext(false);
      return;
    }

    // an empty string would make config/set delete the key (reviving the
    // "auto" default), so an explicit no-hwaccel is an empty list
    const preset: string | string[] =
      selected === AUTO ? derived : selected === NONE ? [] : selected;

    setSaving(true);
    try {
      await axios.put("config/set", {
        config_data: {
          ffmpeg: { hwaccel_args: preset },
        },
        requires_restart: 1,
      });
      onNext(true);
    } catch {
      toast.error(t("setupWizard.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [selected, derived, onNext, t]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <ActivityIndicator />
        <p className="text-sm text-muted-foreground">
          {t("setupWizard.hwaccel.detecting")}
        </p>
      </div>
    );
  }

  const radioClass = (value: string) =>
    selected === value
      ? "bg-selected from-selected/50 to-selected/90 text-selected"
      : "bg-secondary from-secondary/50 to-secondary/90 text-secondary";

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h2 className="text-xl font-semibold">
          {t("setupWizard.hwaccel.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("setupWizard.hwaccel.description")}
        </p>
      </div>

      <RadioGroup value={selected} onValueChange={setSelected}>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center space-x-2">
            <RadioGroupItem
              value={AUTO}
              id="hwaccel-auto"
              className={radioClass(AUTO)}
            />
            <label htmlFor="hwaccel-auto" className="cursor-pointer text-sm">
              {t("setupWizard.hwaccel.auto")}
            </label>
          </div>
          <p className="ml-6 text-xs text-muted-foreground">
            {derived
              ? t("setupWizard.hwaccel.autoResolved", { preset: derived })
              : recommendError
                ? t("setupWizard.hwaccel.recommendFailed")
                : t("setupWizard.hwaccel.autoNone")}
          </p>
        </div>

        {HWACCEL_PRESETS.map((preset) => (
          <div key={preset.key} className="flex items-center space-x-2">
            <RadioGroupItem
              value={preset.value}
              id={`hwaccel-${preset.key}`}
              className={radioClass(preset.value)}
            />
            <label
              htmlFor={`hwaccel-${preset.key}`}
              className="cursor-pointer text-sm"
            >
              {t(`setupWizard.hwaccel.presets.${preset.key}`)}
            </label>
          </div>
        ))}

        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value={NONE}
            id="hwaccel-none"
            className={radioClass(NONE)}
          />
          <label htmlFor="hwaccel-none" className="cursor-pointer text-sm">
            {t("setupWizard.hwaccel.presets.none")}
          </label>
        </div>
      </RadioGroup>

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-4">
        <Button type="button" onClick={onBack}>
          {t("setupWizard.actions.back")}
        </Button>
        <div className="flex flex-1 justify-end gap-3">
          <Button type="button" variant="outline" onClick={onSkip}>
            {t("setupWizard.actions.skip")}
          </Button>
          <Button
            type="button"
            variant="select"
            onClick={handleSave}
            disabled={saving}
          >
            {saving
              ? t("setupWizard.actions.saving")
              : t("setupWizard.actions.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
