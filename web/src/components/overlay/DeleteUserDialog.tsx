import { Trans } from "react-i18next";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type SetPasswordProps = {
  show: boolean;
  onDelete: () => void;
  onCancel: () => void;
};
export default function DeleteUserDialog({
  show,
  onDelete,
  onCancel,
}: SetPasswordProps) {
  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans ns="views/settings">users.dialog.deleteUser</Trans>
          </DialogTitle>
        </DialogHeader>
        <div>
          <Trans ns="views/settings">users.dialog.deleteUser.warn</Trans>
        </div>
        <DialogFooter>
          <Button
            className="flex items-center gap-1"
            aria-label="Confirm delete"
            variant="destructive"
            size="sm"
            onClick={onDelete}
          >
            <Trans>button.delete</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
