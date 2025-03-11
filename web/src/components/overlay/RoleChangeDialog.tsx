import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useState } from "react";
import { LuShield, LuUser } from "react-icons/lu";

type RoleChangeDialogProps = {
  show: boolean;
  username: string;
  currentRole: "admin" | "viewer";
  onSave: (role: "admin" | "viewer") => void;
  onCancel: () => void;
};

export default function RoleChangeDialog({
  show,
  username,
  currentRole,
  onSave,
  onCancel,
}: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<"admin" | "viewer">(
    currentRole,
  );

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Change User Role
          </DialogTitle>
          <DialogDescription>
            Update permissions for{" "}
            <span className="font-medium">{username}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="mb-4 text-sm text-muted-foreground">
            <p>Select the appropriate role for this user:</p>
            <ul className="mt-2 space-y-1 pl-5">
              <li>
                • <span className="font-medium">Admin:</span> Full access to all
                features.
              </li>
              <li>
                • <span className="font-medium">Viewer:</span> Limited to Live
                dashboards, Review, Explore, and Exports only.
              </li>
            </ul>
          </div>

          <Select
            value={selectedRole}
            onValueChange={(value) =>
              setSelectedRole(value as "admin" | "viewer")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin" className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <LuShield className="size-4 text-primary" />
                  <span>Admin</span>
                </div>
              </SelectItem>
              <SelectItem value="viewer" className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <LuUser className="size-4 text-primary" />
                  <span>Viewer</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="flex gap-3 sm:justify-end">
          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                aria-label="Cancel"
                onClick={onCancel}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="select"
                aria-label="Save"
                className="flex flex-1"
                onClick={() => onSave(selectedRole)}
                disabled={selectedRole === currentRole}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
