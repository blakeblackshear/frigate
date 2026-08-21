import ActivityIndicator from "@/components/indicators/activity-indicator";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { HwaccelFamily, HwaccelRecommendation } from "@/types/hardware";
import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSWR from "swr";

const AUTO = "auto";
const NONE = "none";

// the codec key of a preset that decodes anything
const ANY_CODEC = "any";

// ffprobe names h265 streams hevc
const CODEC_ALIASES: Record<string, string> = { hevc: "h265" };

function normalizeCodec(codec: string): string {
  const lower = codec.toLowerCase();
  return CODEC_ALIASES[lower] ?? lower;
}

type SetupHwAccelProps = {
  detectorHardwareKey?: string;
  // detect stream codec of each camera added in the wizard, keyed by camera
  // name. hwaccel only applies to the detect stream.
  detectCodecs: Record<string, string>;
  // saved reports whether a config write happened, so the wizard knows
  // whether finishing requires a restart
  onNext: (saved: boolean) => void;
  onBack: () => void;
  onSkip: () => void;
};

export default function SetupHwAccel({
  detectorHardwareKey,
  detectCodecs,
  onNext,
  onBack,
  onSkip,
}: SetupHwAccelProps) {
  const { t } = useTranslation(["views/setup"]);

  const cameraCodecs = useMemo(
    () =>
      Object.entries(detectCodecs).map(([camera, codec]) => ({
        camera,
        codec: normalizeCodec(codec),
      })),
    [detectCodecs],
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();

    if (detectorHardwareKey) {
      params.set("detector", detectorHardwareKey);
    }

    const codecs = [...new Set(cameraCodecs.map((entry) => entry.codec))];

    if (codecs.length > 0) {
      params.set("codecs", codecs.join(","));
    }

    return params.toString();
  }, [detectorHardwareKey, cameraCodecs]);

  const {
    data: recommendation,
    isLoading,
    error: recommendError,
  } = useSWR<HwaccelRecommendation>(
    query ? `hardware/hwaccel?${query}` : "hardware/hwaccel",
    { revalidateOnFocus: false },
  );

  const [selected, setSelected] = useState<string>(AUTO);
  const [saving, setSaving] = useState(false);

  const families = useMemo(
    () => recommendation?.available ?? [],
    [recommendation],
  );
  const derived = recommendation?.recommended ?? "";

  /** The config a family should be saved as, or null when it writes nothing. */
  const configFor = useCallback(
    (family: HwaccelFamily | undefined): Record<string, unknown> | null => {
      if (!family) {
        return null;
      }

      const shared = family.presets[ANY_CODEC];

      if (shared) {
        return { ffmpeg: { hwaccel_args: shared } };
      }

      // this family decodes one codec per preset, so each camera needs the
      // preset matching its own detect stream
      const perCamera = cameraCodecs
        .map((entry) => ({ ...entry, preset: family.presets[entry.codec] }))
        .filter((entry) => entry.preset);

      if (perCamera.length === 0) {
        // no camera to match, so fall back to the family's first preset
        const fallback = Object.values(family.presets)[0];
        return fallback ? { ffmpeg: { hwaccel_args: fallback } } : null;
      }

      const presets = new Set(perCamera.map((entry) => entry.preset));

      if (presets.size === 1 && perCamera.length === cameraCodecs.length) {
        // every camera wants the same preset, so one global value says it
        return { ffmpeg: { hwaccel_args: [...presets][0] } };
      }

      // the global stays on auto, so cameras added later still get resolved
      // at startup rather than inheriting one camera's codec
      return {
        cameras: Object.fromEntries(
          perCamera.map((entry) => [
            entry.camera,
            { ffmpeg: { hwaccel_args: entry.preset } },
          ]),
        ),
      };
    },
    [cameraCodecs],
  );

  const handleSave = useCallback(async () => {
    const key = selected === AUTO ? derived : selected;

    const configData =
      selected === NONE
        ? // an empty string would make config/set delete the key (reviving the
          // "auto" default), so an explicit no-hwaccel is an empty list
          { ffmpeg: { hwaccel_args: [] } }
        : configFor(families.find((family) => family.key === key));

    // Auto with nothing derived writes nothing: the config default of "auto"
    // stays in place and the backend decides at startup
    if (!configData) {
      onNext(false);
      return;
    }

    setSaving(true);
    try {
      await axios.put("config/set", {
        config_data: configData,
        requires_restart: 1,
      });
      onNext(true);
    } catch {
      toast.error(t("setupWizard.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [selected, derived, families, configFor, onNext, t]);

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
              ? t("setupWizard.hwaccel.autoResolved", {
                  family: t(`setupWizard.hwaccel.families.${derived}`),
                })
              : recommendError
                ? t("setupWizard.hwaccel.recommendFailed")
                : t("setupWizard.hwaccel.autoNone")}
          </p>
        </div>

        {families.map((family) => (
          <div key={family.key} className="flex items-center space-x-2">
            <RadioGroupItem
              value={family.key}
              id={`hwaccel-${family.key}`}
              className={radioClass(family.key)}
            />
            <label
              htmlFor={`hwaccel-${family.key}`}
              className="cursor-pointer text-sm"
            >
              {t(`setupWizard.hwaccel.families.${family.key}`)}
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
            {t("setupWizard.hwaccel.families.none")}
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
