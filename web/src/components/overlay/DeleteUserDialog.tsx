import { Trans } from "react-i18next";
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
  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center gap-2 sm:items-start">
          <div className="space-y-1 text-center sm:text-left">
            <Trans ns="views/settings">users.dialog.deleteUser.title</Trans>
            <DialogDescription>
              <Trans ns="views/settings">users.dialog.deleteUser.desc</Trans>
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="my-4 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-center text-sm">
          <p className="font-medium text-destructive">
            <Trans ns="views/settings" values={{ username }}>
              users.dialog.deleteUser.warn
            </Trans>
          </p>
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                aria-label="Cancel"
                onClick={onCancel}
                type="button"
              >
                <Trans>button.cancel</Trans>
              </Button>
              <Button
                variant="destructive"
                aria-label="Delete"
                className="flex flex-1"
                onClick={onDelete}
              >
                <Trans>button.delete</Trans>
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
