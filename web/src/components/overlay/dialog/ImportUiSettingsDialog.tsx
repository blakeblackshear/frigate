import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LuTriangleAlert } from "react-icons/lu";
import FilterSwitch from "@/components/filter/FilterSwitch";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import {
  ImportSummary,
  TransferSection,
  UiSettingsFile,
} from "@/utils/uiSettingsTransfer";

type ImportUiSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  file: UiSettingsFile;
  summary: ImportSummary;
  onConfirm: (sections: Record<TransferSection, boolean>) => Promise<void>;
};

export default function ImportUiSettingsDialog({
  open,
  onOpenChange,
  fileName,
  file,
  summary,
  onConfirm,
}: ImportUiSettingsDialogProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const [isImporting, setIsImporting] = useState(false);

  const available = useMemo(
    () => ({
      layouts: summary.layoutGroupCount > 0,
      streaming: summary.streamingCameraCount > 0,
      preferences: summary.preferenceCount > 0,
    }),
    [summary],
  );

  const [sections, setSections] =
    useState<Record<TransferSection, boolean>>(available);

  // a new file can be chosen while this component stays mounted, so the
  // toggles reset to what the current file actually offers each time it
  // opens
  useEffect(() => {
    if (open) {
      setSections(available);
      setIsImporting(false);
    }
  }, [open, available]);

  const canImport = useMemo(
    () =>
      !isImporting &&
      (Object.keys(sections) as TransferSection[]).some(
        (section) => sections[section] && available[section],
      ),
    [isImporting, sections, available],
  );

  // warn only about what the enabled sections will actually write
  const visibleUnknownGroups = useMemo(() => {
    const groups = new Set<string>();

    if (sections.layouts) {
      summary.unknownLayoutGroups.forEach((group) => groups.add(group));
    }

    if (sections.streaming) {
      summary.unknownStreamingGroups.forEach((group) => groups.add(group));
    }

    return Array.from(groups).sort();
  }, [sections, summary]);

  const visibleUnknownCameras = useMemo(
    () => (sections.streaming ? summary.unknownCameras : []),
    [sections.streaming, summary.unknownCameras],
  );

  const handleConfirm = useCallback(async () => {
    setIsImporting(true);
    await onConfirm(sections);
    setIsImporting(false);
  }, [onConfirm, sections]);

  const exportedDate = useMemo(() => {
    const parsed = new Date(file.exported_at);
    return isNaN(parsed.getTime()) ? file.exported_at : parsed.toLocaleString();
  }, [file.exported_at]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scrollbar-container max-h-[80dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("general.backupRestore.importDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("general.backupRestore.importDialog.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-0.5">
          <p className="break-all text-base text-primary-variant">{fileName}</p>
          <p className="text-sm text-muted-foreground">
            {t("general.backupRestore.importDialog.exportedFrom", {
              date: exportedDate,
              version: file.frigate_version,
            })}
          </p>
        </div>

        <div className="space-y-3">
          <FilterSwitch
            label={t("general.backupRestore.importDialog.layouts", {
              count: summary.layoutGroupCount,
            })}
            isChecked={sections.layouts}
            disabled={!available.layouts || isImporting}
            onCheckedChange={(checked) =>
              setSections((prev) => ({ ...prev, layouts: checked }))
            }
          />
          <FilterSwitch
            label={t("general.backupRestore.importDialog.streaming", {
              count: summary.streamingCameraCount,
            })}
            isChecked={sections.streaming}
            disabled={!available.streaming || isImporting}
            onCheckedChange={(checked) =>
              setSections((prev) => ({ ...prev, streaming: checked }))
            }
          />
          <FilterSwitch
            label={t("general.backupRestore.importDialog.preferences", {
              count: summary.preferenceCount,
            })}
            isChecked={sections.preferences}
            disabled={!available.preferences || isImporting}
            onCheckedChange={(checked) =>
              setSections((prev) => ({ ...prev, preferences: checked }))
            }
          />
        </div>

        {(visibleUnknownGroups.length > 0 ||
          visibleUnknownCameras.length > 0) && (
          <Alert variant="warning">
            <LuTriangleAlert className="size-5" />
            <AlertDescription className="space-y-2">
              {visibleUnknownGroups.length > 0 && (
                <p>
                  {t("general.backupRestore.importDialog.unknownGroups", {
                    count: visibleUnknownGroups.length,
                    groups: visibleUnknownGroups.join(", "),
                  })}
                </p>
              )}
              {visibleUnknownCameras.length > 0 && (
                <p>
                  {t("general.backupRestore.importDialog.unknownCameras", {
                    count: visibleUnknownCameras.length,
                    cameras: visibleUnknownCameras.join(", "),
                  })}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button
            aria-label={t("button.cancel", { ns: "common" })}
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
            type="button"
          >
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button
            variant="select"
            aria-label={t("general.backupRestore.importDialog.confirm")}
            onClick={handleConfirm}
            disabled={!canImport}
          >
            {isImporting ? (
              <div className="flex flex-row items-center gap-2">
                <ActivityIndicator />
                <span>{t("general.backupRestore.importDialog.confirm")}</span>
              </div>
            ) : (
              t("general.backupRestore.importDialog.confirm")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
