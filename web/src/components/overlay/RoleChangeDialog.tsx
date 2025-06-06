import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation(["views/settings"]);
  const [selectedRole, setSelectedRole] = useState<"admin" | "viewer">(
    currentRole,
  );

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t("users.dialog.changeRole.title")}
          </DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="users.dialog.changeRole.desc"
              ns="views/settings"
              values={{ username }}
              components={{
                strong: <span className="font-medium" />,
              }}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <div className="mb-4 text-sm text-muted-foreground">
            <p>{t("users.dialog.changeRole.roleInfo.intro")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                <span className="font-medium">
                  {t("users.dialog.changeRole.roleInfo.admin")}
                </span>
                : {t("users.dialog.changeRole.roleInfo.adminDesc")}
              </li>
              <li>
                <span className="font-medium">
                  {t("users.dialog.changeRole.roleInfo.viewer")}
                </span>
                : {t("users.dialog.changeRole.roleInfo.viewerDesc")}
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
              <SelectValue placeholder={t("users.dialog.changeRole.select")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin" className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <LuShield className="size-4 text-primary" />
                  <span>{t("role.admin", { ns: "common" })}</span>
                </div>
              </SelectItem>
              <SelectItem value="viewer" className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <LuUser className="size-4 text-primary" />
                  <span>{t("role.viewer", { ns: "common" })}</span>
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
                aria-label={t("button.cancel", { ns: "common" })}
                onClick={onCancel}
                type="button"
              >
                {t("button.cancel", { ns: "common" })}
              </Button>
              <Button
                variant="select"
                aria-label={t("button.save", { ns: "common" })}
                className="flex flex-1"
                onClick={() => onSave(selectedRole)}
                disabled={selectedRole === currentRole}
              >
                {t("button.save", { ns: "common" })}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
