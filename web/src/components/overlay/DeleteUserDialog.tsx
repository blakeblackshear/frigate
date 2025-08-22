import { Trans, useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "../ui/dialog";
import { DialogDescription } from "@radix-ui/react-dialog";

type DeleteUserDialogProps = {
  show: boolean;
  username?: string;
  onDelete: () => void;
  onCancel: () => void;
};
export default function DeleteUserDialog({
  show,
  username,
  onDelete,
  onCancel,
}: DeleteUserDialogProps) {
  const { t } = useTranslation(["views/settings"]);
  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center gap-2 sm:items-start">
          <div className="space-y-1 text-center sm:text-left">
            {t("users.dialog.deleteUser.title")}
            <DialogDescription>
              {t("users.dialog.deleteUser.desc")}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="my-4 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-center text-sm">
          <p className="font-medium text-destructive">
            <Trans
              i18nKey="users.dialog.deleteUser.warn"
              ns="views/settings"
              values={{ username }}
              components={{
                strong: <span className="font-medium" />,
              }}
            />
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                aria-label={t("button.cancel", { ns: "common" })}
                onClick={onCancel}
                type="button"
              >
                {t("button.cancel", { ns: "common" })}
              </Button>
              <Button
                variant="destructive"
                aria-label={t("button.delete", { ns: "common" })}
                className="flex flex-1 text-white"
                onClick={onDelete}
              >
                {t("button.delete", { ns: "common" })}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
