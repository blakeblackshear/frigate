import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trans } from "react-i18next";
import { useTranslation } from "react-i18next";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useState } from "react";

type DeleteRoleDialogProps = {
  show: boolean;
  role: string;
  onCancel: () => void;
  onDelete: () => void;
};

export default function DeleteRoleDialog({
  show,
  role,
  onCancel,
  onDelete,
}: DeleteRoleDialogProps) {
  const { t } = useTranslation("views/settings");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete();
    } catch (error) {
      // Error handled in parent
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("roles.dialog.deleteRole.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="roles.dialog.deleteRole.desc"
              ns="views/settings"
              values={{ role }}
              components={{
                strong: <span className="font-medium" />,
              }}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <div className="text-sm text-muted-foreground">
            <p>
              <Trans
                ns={"views/settings"}
                values={{ role }}
                components={{ strong: <span className="font-medium" /> }}
              >
                roles.dialog.deleteRole.warn
              </Trans>
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-2 sm:justify-end">
          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                aria-label={t("button.cancel", { ns: "common" })}
                variant="outline"
                disabled={isLoading}
                onClick={onCancel}
                type="button"
              >
                {t("button.cancel", { ns: "common" })}
              </Button>
              <Button
                className="flex flex-1"
                aria-label={t("button.delete", { ns: "common" })}
                variant="destructive"
                disabled={isLoading}
                onClick={handleDelete}
                type="button"
              >
                {isLoading ? (
                  <div className="flex flex-row items-center gap-2">
                    <ActivityIndicator />
                    <span>{t("roles.dialog.deleteRole.deleting")}</span>
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
