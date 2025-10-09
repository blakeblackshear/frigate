import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { LuShield, LuUser } from "react-icons/lu";

type RoleChangeDialogProps = {
  show: boolean;
  username: string;
  currentRole: string;
  availableRoles: string[];
  onSave: (role: string) => void;
  onCancel: () => void;
};

export default function RoleChangeDialog({
  show,
  username,
  currentRole,
  availableRoles,
  onSave,
  onCancel,
}: RoleChangeDialogProps) {
  const { t } = useTranslation(["views/settings"]);
  const [selectedRole, setSelectedRole] = useState<string>(currentRole);

  return (
    <Dialog open={show} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
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
              {availableRoles
                .filter((role) => role !== "admin" && role !== "viewer")
                .map((role) => (
                  <li key={role}>
                    <span className="font-medium">{role}</span>:{" "}
                    {t("users.dialog.changeRole.roleInfo.customDesc")}
                  </li>
                ))}
            </ul>
          </div>

          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("users.dialog.changeRole.select")} />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem
                  key={role}
                  value={role}
                  className="flex items-center gap-2"
                >
                  <div className="flex items-center gap-2">
                    {role === "admin" ? (
                      <LuShield className="size-4 text-primary" />
                    ) : role === "viewer" ? (
                      <LuUser className="size-4 text-primary" />
                    ) : (
                      <LuUser className="size-4 text-muted-foreground" />
                    )}
                    <span>
                      {role === "admin"
                        ? t("role.admin", { ns: "common" })
                        : role === "viewer"
                          ? t("role.viewer", { ns: "common" })
                          : role}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="flex gap-3 sm:justify-end">
          <div className="flex flex-1 flex-col justify-end">
            <div className="flex flex-row gap-2 pt-5">
              <Button
                className="flex flex-1"
                aria-label={t("button.cancel", { ns: "common" })}
                variant="outline"
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
                type="button"
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
