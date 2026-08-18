import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import axios from "axios";
import useSWR from "swr";

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
      await axios.put("config/set", {
        config_data: {
          record: {
            enabled,
            alerts: { retain: { days: retentionDays } },
            detections: { retain: { days: retentionDays } },
          },
        },
        requires_restart: 1,
      });
      onNext();
    } catch {
      toast.error(t("setupWizard.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [enabled, retentionDays, onNext, t]);

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
            <Label htmlFor="retention-days">
              {t("setupWizard.recording.retentionDays")}
            </Label>
            <Input
              id="retention-days"
              type="number"
              min={1}
              max={365}
              value={retentionDays}
              onChange={(e) =>
                setRetentionDays(Math.max(1, parseInt(e.target.value) || 1))
              }
            />
          </div>

          {freeGb !== null && estimatedDays !== null && cameraCount > 0 && (
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
