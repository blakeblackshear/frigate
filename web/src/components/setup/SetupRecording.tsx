import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import axios from "axios";
import useSWR from "swr";

const EVENTS = "events";
const CONTINUOUS = "continuous";

const MODES = [EVENTS, CONTINUOUS] as const;

type SetupRecordingProps = {
  cameraNames: string[];
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
};

export default function SetupRecording({
  cameraNames,
  onNext,
  onBack,
  onSkip,
}: SetupRecordingProps) {
  const { t } = useTranslation(["views/setup"]);
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<string>(EVENTS);
  const [retentionDays, setRetentionDays] = useState(10);
  const [saving, setSaving] = useState(false);

  const { data: stats } = useSWR("stats", { revalidateOnFocus: false });

  // Calculate storage estimate
  const storageInfo = stats?.service?.storage?.["/tmp/frigate/recordings"];
  const freeGb = storageInfo ? Math.round(storageInfo.free / 1024) : null;
  const cameraCount = cameraNames.length;
  // Rough estimate: ~2 Mbps per camera continuous recording
  const estimatedDays =
    freeGb && cameraCount > 0
      ? Math.round((freeGb * 1024) / ((2 * 0.125 * 86400) / 1024) / cameraCount)
      : null;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const record: Record<string, unknown> = { enabled };

      if (enabled) {
        record.alerts = { retain: { days: retentionDays } };
        record.detections = { retain: { days: retentionDays } };
        // continuous keeps every segment, so it is the one that needs turning
        // on. Its default of 0 already means "only what was detected".
        record.continuous = { days: mode === CONTINUOUS ? retentionDays : 0 };
      }

      await axios.put("config/set", {
        config_data: { record },
        requires_restart: 1,
      });
      onNext();
    } catch {
      toast.error(t("setupWizard.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [enabled, mode, retentionDays, onNext, t]);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div>
        <h2 className="text-xl font-semibold">
          {t("setupWizard.recording.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("setupWizard.recording.description")}
        </p>
      </div>

      {cameraCount === 0 && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          {t("setupWizard.recording.noCameras")}
        </p>
      )}

      <div className="flex items-center justify-between rounded-md border p-4">
        <Label htmlFor="recording-toggle" className="font-medium">
          {t("setupWizard.recording.enableRecording")}
        </Label>
        <Switch
          id="recording-toggle"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>

      {enabled && (
        <>
          <div className="flex flex-col gap-2">
            <Label>{t("setupWizard.recording.modeLabel")}</Label>
            <RadioGroup value={mode} onValueChange={setMode}>
              {MODES.map((option) => (
                <div key={option} className="flex flex-col gap-0.5">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value={option}
                      id={`recording-mode-${option}`}
                      className={
                        mode === option
                          ? "bg-selected from-selected/50 to-selected/90 text-selected"
                          : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                      }
                    />
                    <label
                      htmlFor={`recording-mode-${option}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {t(`setupWizard.recording.modes.${option}.label`)}
                    </label>
                  </div>
                  <p className="ml-6 text-xs text-muted-foreground">
                    {t(`setupWizard.recording.modes.${option}.description`)}
                  </p>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="retention-days">
              {t("setupWizard.recording.retentionDays")}
            </Label>
            <Input
              id="retention-days"
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              // the spinner arrows are noise at this size, and the field is
              // still typeable and arrow-key steppable without them
              className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              onChange={(e) =>
                setRetentionDays(Math.max(1, parseInt(e.target.value) || 1))
              }
            />
            <p className="text-xs text-muted-foreground">
              {t(`setupWizard.recording.retentionHint.${mode}`)}
            </p>
          </div>

          {mode === CONTINUOUS &&
            freeGb !== null &&
            estimatedDays !== null &&
            cameraCount > 0 && (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {t("setupWizard.recording.storageEstimate", {
                  free: freeGb,
                  days: estimatedDays,
                  cameras: cameraCount,
                })}
              </p>
            )}
        </>
      )}

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
