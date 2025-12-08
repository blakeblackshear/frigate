import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { baseUrl } from "../../api/baseUrl";
import { cn } from "@/lib/utils";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { isDesktop } from "react-device-detect";
import { VscAccount } from "react-icons/vsc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { LuLogOut, LuSquarePen } from "react-icons/lu";
import useSWR from "swr";

import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import SetPasswordDialog from "../overlay/SetPasswordDialog";
import { useTranslation } from "react-i18next";

type AccountSettingsProps = {
  className?: string;
};

export default function AccountSettings({ className }: AccountSettingsProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { data: profile } = useSWR("profile");
  const { data: config } = useSWR("config");
  const logoutUrl = config?.proxy?.logout_url || `${baseUrl}api/logout`;

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const Container = isDesktop ? DropdownMenu : Drawer;
  const Trigger = isDesktop ? DropdownMenuTrigger : DrawerTrigger;
  const Content = isDesktop ? DropdownMenuContent : DrawerContent;
  const MenuItem = isDesktop ? DropdownMenuItem : DrawerClose;

  const handlePasswordSave = async (password: string, oldPassword?: string) => {
    if (!profile?.username || profile.username === "anonymous") return;
    setIsPasswordLoading(true);
    axios
      .put(`users/${profile.username}/password`, {
        password,
        old_password: oldPassword,
      })
      .then((response) => {
        if (response.status === 200) {
          setPasswordDialogOpen(false);
          setPasswordError(null);
          setIsPasswordLoading(false);
          toast.success(t("users.toast.success.updatePassword"), {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";

        // Keep dialog open and show error
        setPasswordError(errorMessage);
        setIsPasswordLoading(false);
      });
  };

  return (
    <Container modal={!isDesktop}>
      <Tooltip>
        <Trigger asChild>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex flex-col items-center justify-center",
                isDesktop
                  ? "cursor-pointer rounded-lg bg-secondary text-secondary-foreground hover:bg-muted"
                  : "text-secondary-foreground",
                className,
              )}
            >
              <VscAccount className="size-5 md:m-[6px]" />
            </div>
          </TooltipTrigger>
        </Trigger>
        <TooltipPortal>
          <TooltipContent side="right" sideOffset={5}>
            <p>{t("menu.user.account", { ns: "common" })}</p>
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>

      <Content
        className={cn(
          isDesktop ? "mr-5 w-72" : "max-h-[75dvh] overflow-hidden p-4",
        )}
      >
        <div className="scrollbar-container w-full flex-col overflow-y-auto overflow-x-hidden">
          <DropdownMenuLabel className="flex flex-col gap-1.5">
            <div>
              {t("menu.user.current", {
                ns: "common",
                user:
                  profile?.username ||
                  t("menu.user.anonymous", { ns: "common" }),
              })}{" "}
              {t("role." + profile?.role) &&
                `(${t("role." + profile?.role, { ns: "common" })})`}
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className={isDesktop ? "my-2" : "my-2"} />

          {profile?.username && profile.username !== "anonymous" && (
            <MenuItem
              className={cn(
                "flex w-full items-center gap-2",
                isDesktop ? "cursor-pointer" : "p-2 text-sm",
              )}
              aria-label={t("menu.user.setPassword", { ns: "common" })}
              onClick={() => setPasswordDialogOpen(true)}
            >
              <LuSquarePen className="mr-2 size-4" />
              <span>{t("menu.user.setPassword", { ns: "common" })}</span>
            </MenuItem>
          )}

          <MenuItem
            className={cn(
              "flex w-full items-center gap-2",
              isDesktop ? "cursor-pointer" : "p-2 text-sm",
            )}
            asChild
            aria-label={t("menu.user.logout", { ns: "common" })}
          >
            <a href={logoutUrl} className="flex items-center gap-2">
              <LuLogOut className="mr-2 size-4" />
              <span>{t("menu.user.logout", { ns: "common" })}</span>
            </a>
          </MenuItem>
        </div>
      </Content>
      <SetPasswordDialog
        show={passwordDialogOpen}
        onSave={handlePasswordSave}
        onCancel={() => {
          setPasswordDialogOpen(false);
          setPasswordError(null);
        }}
        initialError={passwordError}
        username={profile?.username}
        isLoading={isPasswordLoading}
      />
    </Container>
  );
}
