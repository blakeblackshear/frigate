import ActivityIndicator from "@/components/indicators/activity-indicator";
import type { FrigatePlusModel } from "@/components/config-form/theme/fields/ModelSourcePicker";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDocDomain } from "@/hooks/use-doc-domain";
import type { FrigateConfig } from "@/types/frigateConfig";
import type { DetectionHardware } from "@/types/hardware";
import { recommendedDetectorCount } from "@/utils/detectionHardware";
import axios from "axios";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuExternalLink } from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";

// these ship no default model, so configuring one without a model leaves the
// detector unable to start
const MODEL_REQUIRED_DETECTORS = ["onnx", "tensorrt"];

const CPU_FALLBACK: DetectionHardware[] = [
  {
    key: "cpu",
    detector: "cpu",
    name: "CPU",
    units: [{ device: "cpu", label: "CPU" }],
    count: 1,
    unlimited: true,
  },
];

type SetupDetectorProps = {
  cameraCount: number;
  onNext: (hardwareKey: string) => void;
  onBack: () => void;
  onSkip: (hardwareKey?: string) => void;
};

export default function SetupDetector({
  cameraCount,
  onNext,
  onBack,
  onSkip,
}: SetupDetectorProps) {
  const { t } = useTranslation(["views/setup", "common"]);
  const { getLocaleDocUrl } = useDocDomain();

  const {
    data: hardware,
    isLoading,
    error: probeError,
  } = useSWR<DetectionHardware[]>("hardware/probe", {
    revalidateOnFocus: false,
  });

  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const plusEnabled = Boolean(config?.plus?.enabled);

  // the cpu is always probed, so an empty list means the probe failed
  const options = useMemo(
    () => (hardware && hardware.length > 0 ? hardware : CPU_FALLBACK),
    [hardware],
  );

  // the prober orders accelerators ahead of the cpu
  const recommendedKey = options[0].key;
  const [selectedKey, setSelectedKey] = useState<string>();
  const selected =
    options.find((entry) => entry.key === (selectedKey ?? recommendedKey)) ??
    options[0];

  const needsModel = MODEL_REQUIRED_DETECTORS.includes(selected.detector);

  const { data: plusModels } = useSWR<FrigatePlusModel[]>(
    plusEnabled && needsModel ? "/plus/models" : null,
    {
      fetcher: async (url) => {
        const res = await axios.get(url, { withCredentials: true });
        return res.data;
      },
    },
  );
  const [plusModelId, setPlusModelId] = useState("");

  const compatiblePlusModels = useMemo(
    () =>
      (plusModels ?? []).filter((model) =>
        model.supportedDetectors.includes(selected.detector),
      ),
    [plusModels, selected.detector],
  );

  const [saving, setSaving] = useState(false);

  const buildDevices = useCallback(
    (entry: DetectionHardware): string[] => {
      const first = entry.units[0]?.device;

      if (!first) {
        return [];
      }

      if (!entry.unlimited) {
        return [first];
      }

      // repeating a device runs an extra inference process on it
      const count = recommendedDetectorCount(Math.max(cameraCount, 1));
      return Array.from({ length: count }, () => first);
    },
    [cameraCount],
  );

  const handleSave = useCallback(async () => {
    if (needsModel && !plusModelId) {
      onSkip(selected.key);
      return;
    }

    setSaving(true);
    try {
      const model: Record<string, unknown> = {
        devices: buildDevices(selected),
      };

      if (needsModel) {
        model.path = `plus://${plusModelId}`;
      }

      await axios.put("config/set", {
        config_data: {
          models: [model],
          detect: { enabled: true },
        },
        requires_restart: 1,
      });
      onNext(selected.key);
    } catch {
      toast.error(t("setupWizard.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [needsModel, plusModelId, selected, buildDevices, onNext, onSkip, t]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <ActivityIndicator />
        <p className="text-sm text-muted-foreground">
          {t("setupWizard.detector.detecting")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h2 className="text-xl font-semibold">
          {t("setupWizard.detector.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("setupWizard.detector.description")}
        </p>
      </div>

      {probeError && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {t("setupWizard.detector.probeFailed")}
        </p>
      )}

      <RadioGroup
        value={selected.key}
        onValueChange={(value) => {
          setSelectedKey(value);
          setPlusModelId("");
        }}
      >
        {options.map((entry) => (
          <div key={entry.key} className="flex items-center space-x-2">
            <RadioGroupItem
              value={entry.key}
              id={`detector-${entry.key}`}
              className={
                selected.key === entry.key
                  ? "bg-selected from-selected/50 to-selected/90 text-selected"
                  : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
              }
            />
            <label
              htmlFor={`detector-${entry.key}`}
              className="cursor-pointer text-sm font-medium"
            >
              {entry.name}
              {entry.count > 1 ? ` (${entry.count})` : ""}
              {entry.key === recommendedKey && entry.key !== "cpu" && (
                <span className="ml-2 text-xs text-selected">
                  {t("setupWizard.detector.recommended")}
                </span>
              )}
            </label>
          </div>
        ))}
      </RadioGroup>

      {needsModel && (
        <div className="flex flex-col gap-3 rounded-md bg-muted p-3 text-sm">
          <p>
            {t("setupWizard.detector.modelRequired", { name: selected.name })}
          </p>
          {plusEnabled ? (
            <Select value={plusModelId} onValueChange={setPlusModelId}>
              <SelectTrigger className="max-w-xs">
                <SelectValue
                  placeholder={t("setupWizard.detector.plusModelPlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {compatiblePlusModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {`${model.name} (${model.width}x${model.height})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <a
              href={getLocaleDocUrl("configuration/object_detectors")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary"
            >
              {t("readTheDocumentation", { ns: "common" })}
              <LuExternalLink className="ml-2 size-3" />
            </a>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-4">
        <Button type="button" onClick={onBack}>
          {t("setupWizard.actions.back")}
        </Button>
        <div className="flex flex-1 justify-end gap-3">
          <Button type="button" onClick={() => onSkip(selected.key)}>
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
              : needsModel && !plusModelId
                ? t("setupWizard.detector.continueWithout")
                : t("setupWizard.actions.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
