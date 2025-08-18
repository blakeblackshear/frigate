import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trans } from "react-i18next";
import ActivityIndicator from "@/components/indicators/activity-indicator";

type DeleteTriggerDialogProps = {
  show: boolean;
  triggerName: string;
  isLoading: boolean;
  onCancel: () => void;
  onDelete: () => void;
};

export default function DeleteTriggerDialog({
  show,
  triggerName,
  isLoading,
  onCancel,
  onDelete,
}: DeleteTriggerDialogProps) {
  const { t } = useTranslation("views/settings");

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("triggers.dialog.deleteTrigger.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              ns={"views/settings"}
              values={{ triggerName }}
              components={{ strong: <span className="font-medium" /> }}
            >
              triggers.dialog.deleteTrigger.desc
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 sm:justify-end">
          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                aria-label={t("button.cancel", { ns: "common" })}
                onClick={onCancel}
                type="button"
                disabled={isLoading}
              >
                {t("button.cancel", { ns: "common" })}
              </Button>
              <Button
                variant="destructive"
                aria-label={t("button.delete", { ns: "common" })}
                className="flex flex-1 text-white"
                onClick={onDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex flex-row items-center gap-2">
                    <ActivityIndicator />
                    <span>{t("button.delete", { ns: "common" })}</span>
                  </div>
                ) : (
                  t("button.delete", { ns: "common" })
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
