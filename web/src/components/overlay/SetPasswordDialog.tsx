import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

type SetPasswordProps = {
  show: boolean;
  onSave: (password: string) => void;
  onCancel: () => void;
};
export default function SetPasswordDialog({
  show,
  onSave,
  onCancel,
}: SetPasswordProps) {
  const [password, setPassword] = useState<string>();

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Set Password</DialogTitle>
        </DialogHeader>
        <Input
          className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <DialogFooter>
          <Button
            className="flex items-center gap-1"
            aria-label="Save Password"
            variant="select"
            size="sm"
            onClick={() => {
              onSave(password!);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
