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
} from "../ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { DialogClose } from "../ui/dialog";
import { LuLogOut, LuSquarePen } from "react-icons/lu";
import useSWR from "swr";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import SetPasswordDialog from "../overlay/SetPasswordDialog";

type AccountSettingsProps = {
  className?: string;
};

export default function AccountSettings({ className }: AccountSettingsProps) {
  const { data: profile } = useSWR("profile");
  const { data: config } = useSWR("config");
  const logoutUrl = config?.proxy?.logout_url || `${baseUrl}api/logout`;

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const Container = isDesktop ? DropdownMenu : Drawer;
  const Trigger = isDesktop ? DropdownMenuTrigger : DrawerTrigger;
  const Content = isDesktop ? DropdownMenuContent : DrawerContent;
  const MenuItem = isDesktop ? DropdownMenuItem : DialogClose;

  const handlePasswordSave = async (password: string) => {
    if (!profile?.username || profile.username === "anonymous") return;
    axios
      .put(`users/${profile.username}/password`, { password })
      .then((response) => {
        if (response.status === 200) {
          setPasswordDialogOpen(false);
          toast.success("Password updated successfully.", {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(`Error setting password: ${errorMessage}`, {
          position: "top-center",
        });
      });
  };

  return (
    <Container modal={!isDesktop}>
      <Trigger>
        <Tooltip>
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
          <TooltipPortal>
            <TooltipContent side="right">
              <p>Account</p>
            </TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </Trigger>
      <Content
        className={
          isDesktop ? "mr-5 w-72" : "max-h-[75dvh] overflow-hidden p-2"
        }
      >
        <div className="scrollbar-container w-full flex-col overflow-y-auto overflow-x-hidden">
          <DropdownMenuLabel>
            Current User: {profile?.username || "anonymous"}{" "}
            {profile?.role && `(${profile.role})`}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className={isDesktop ? "mt-3" : "mt-1"} />
          {profile?.username && profile.username !== "anonymous" && (
            <MenuItem
              className={
                isDesktop ? "cursor-pointer" : "flex items-center p-2 text-sm"
              }
              aria-label="Set Password"
              onClick={() => setPasswordDialogOpen(true)}
            >
              <LuSquarePen className="mr-2 size-4" />
              <span>Set Password</span>
            </MenuItem>
          )}
          <MenuItem
            className={
              isDesktop ? "cursor-pointer" : "flex items-center p-2 text-sm"
            }
            aria-label="Log out"
          >
            <a className="flex" href={logoutUrl}>
              <LuLogOut className="mr-2 size-4" />
              <span>Logout</span>
            </a>
          </MenuItem>
        </div>
      </Content>
      <SetPasswordDialog
        show={passwordDialogOpen}
        onSave={handlePasswordSave}
        onCancel={() => setPasswordDialogOpen(false)}
        username={profile?.username}
      />
    </Container>
  );
}
