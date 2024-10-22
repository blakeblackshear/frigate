import {
  LuActivity,
  LuGithub,
  LuLifeBuoy,
  LuList,
  LuLogOut,
  LuMoon,
  LuPenSquare,
  LuRotateCw,
  LuSettings,
  LuSun,
  LuSunMoon,
} from "react-icons/lu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Link } from "react-router-dom";
import { CgDarkMode } from "react-icons/cg";
import {
  colorSchemes,
  friendlyColorSchemeName,
  useTheme,
} from "@/context/theme-provider";
import { IoColorPalette } from "react-icons/io5";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useEffect, useState } from "react";
import { useRestart } from "@/api/ws";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ActivityIndicator from "../indicators/activity-indicator";
import { isDesktop, isMobile } from "react-device-detect";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogPortal,
  DialogTrigger,
} from "../ui/dialog";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { baseUrl } from "@/api/baseUrl";
import useSWR from "swr";

type GeneralSettingsProps = {
  className?: string;
};
export default function GeneralSettings({ className }: GeneralSettingsProps) {
  const { data: profile } = useSWR("profile");
  const { data: config } = useSWR("config");
  const logoutUrl = config?.proxy?.logout_url || "/api/logout";

  // settings

  const { theme, colorScheme, setTheme, setColorScheme } = useTheme();
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [restartingSheetOpen, setRestartingSheetOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const { send: sendRestart } = useRestart();

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    if (restartingSheetOpen) {
      countdownInterval = setInterval(() => {
        setCountdown((prevCountdown) => prevCountdown - 1);
      }, 1000);
    }

    return () => {
      clearInterval(countdownInterval);
    };
  }, [restartingSheetOpen]);

  useEffect(() => {
    if (countdown === 0) {
      window.location.href = baseUrl;
    }
  }, [countdown]);

  const handleForceReload = () => {
    window.location.href = baseUrl;
  };

  const Container = isDesktop ? DropdownMenu : Drawer;
  const Trigger = isDesktop ? DropdownMenuTrigger : DrawerTrigger;
  const Content = isDesktop ? DropdownMenuContent : DrawerContent;
  const MenuItem = isDesktop ? DropdownMenuItem : DialogClose;
  const SubItem = isDesktop ? DropdownMenuSub : Dialog;
  const SubItemTrigger = isDesktop ? DropdownMenuSubTrigger : DialogTrigger;
  const SubItemContent = isDesktop ? DropdownMenuSubContent : DialogContent;
  const Portal = isDesktop ? DropdownMenuPortal : DialogPortal;

  return (
    <>
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
                <LuSettings className="size-5 md:m-[6px]" />
              </div>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="right">
                <p>Settings</p>
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </Trigger>
        <Content
          style={
            isDesktop
              ? {
                  maxHeight:
                    "var(--radix-dropdown-menu-content-available-height)",
                }
              : {}
          }
          className={
            isDesktop
              ? "scrollbar-container mr-5 w-72 overflow-y-auto"
              : "max-h-[75dvh] overflow-hidden p-2"
          }
        >
          <div className="scrollbar-container w-full flex-col overflow-y-auto overflow-x-hidden">
            {isMobile && (
              <>
                <DropdownMenuLabel>
                  Current User: {profile?.username || "anonymous"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator
                  className={isDesktop ? "mt-3" : "mt-1"}
                />
                <MenuItem
                  className={
                    isDesktop
                      ? "cursor-pointer"
                      : "flex items-center p-2 text-sm"
                  }
                  aria-label="Log out"
                >
                  <a className="flex" href={logoutUrl}>
                    <LuLogOut className="mr-2 size-4" />
                    <span>Logout</span>
                  </a>
                </MenuItem>
              </>
            )}
            <DropdownMenuLabel>System</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className={isDesktop ? "" : "flex flex-col"}>
              <Link to="/system#general">
                <MenuItem
                  className={
                    isDesktop
                      ? "cursor-pointer"
                      : "flex w-full items-center p-2 text-sm"
                  }
                  aria-label="System metrics"
                >
                  <LuActivity className="mr-2 size-4" />
                  <span>System metrics</span>
                </MenuItem>
              </Link>
              <Link to="/logs">
                <MenuItem
                  className={
                    isDesktop
                      ? "cursor-pointer"
                      : "flex w-full items-center p-2 text-sm"
                  }
                  aria-label="System logs"
                >
                  <LuList className="mr-2 size-4" />
                  <span>System logs</span>
                </MenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuLabel className={isDesktop ? "mt-3" : "mt-1"}>
              Configuration
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link to="/settings">
                <MenuItem
                  className={
                    isDesktop
                      ? "cursor-pointer"
                      : "flex w-full items-center p-2 text-sm"
                  }
                  aria-label="Settings"
                >
                  <LuSettings className="mr-2 size-4" />
                  <span>Settings</span>
                </MenuItem>
              </Link>
              <Link to="/config">
                <MenuItem
                  className={
                    isDesktop
                      ? "cursor-pointer"
                      : "flex w-full items-center p-2 text-sm"
                  }
                  aria-label="Configuration editor"
                >
                  <LuPenSquare className="mr-2 size-4" />
                  <span>Configuration editor</span>
                </MenuItem>
              </Link>
              <DropdownMenuLabel className={isDesktop ? "mt-3" : "mt-1"}>
                Appearance
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <SubItem>
                <SubItemTrigger
                  className={
                    isDesktop
                      ? "cursor-pointer"
                      : "flex items-center p-2 text-sm"
                  }
                >
                  <LuSunMoon className="mr-2 size-4" />
                  <span>Dark Mode</span>
                </SubItemTrigger>
                <Portal>
                  <SubItemContent
                    className={
                      isDesktop ? "" : "w-[92%] rounded-lg md:rounded-2xl"
                    }
                  >
                    <span tabIndex={0} className="sr-only" />
                    <MenuItem
                      className={
                        isDesktop
                          ? "cursor-pointer"
                          : "flex items-center p-2 text-sm"
                      }
                      aria-label="Light mode"
                      onClick={() => setTheme("light")}
                    >
                      {theme === "light" ? (
                        <>
                          <LuSun className="mr-2 size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                          Light
                        </>
                      ) : (
                        <span className="ml-6 mr-2">Light</span>
                      )}
                    </MenuItem>
                    <MenuItem
                      className={
                        isDesktop
                          ? "cursor-pointer"
                          : "flex items-center p-2 text-sm"
                      }
                      aria-label="Dark mode"
                      onClick={() => setTheme("dark")}
                    >
                      {theme === "dark" ? (
                        <>
                          <LuMoon className="mr-2 size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                          Dark
                        </>
                      ) : (
                        <span className="ml-6 mr-2">Dark</span>
                      )}
                    </MenuItem>
                    <MenuItem
                      className={
                        isDesktop
                          ? "cursor-pointer"
                          : "flex items-center p-2 text-sm"
                      }
                      aria-label="Use the system settings for light or dark mode"
                      onClick={() => setTheme("system")}
                    >
                      {theme === "system" ? (
                        <>
                          <CgDarkMode className="mr-2 size-4 scale-100 transition-all" />
                          System
                        </>
                      ) : (
                        <span className="ml-6 mr-2">System</span>
                      )}
                    </MenuItem>
                  </SubItemContent>
                </Portal>
              </SubItem>
              <SubItem>
                <SubItemTrigger
                  className={
                    isDesktop
                      ? "cursor-pointer"
                      : "flex items-center p-2 text-sm"
                  }
                >
                  <LuSunMoon className="mr-2 size-4" />
                  <span>Theme</span>
                </SubItemTrigger>
                <Portal>
                  <SubItemContent
                    className={
                      isDesktop ? "" : "w-[92%] rounded-lg md:rounded-2xl"
                    }
                  >
                    <span tabIndex={0} className="sr-only" />
                    {colorSchemes.map((scheme) => (
                      <MenuItem
                        key={scheme}
                        className={
                          isDesktop
                            ? "cursor-pointer"
                            : "flex items-center p-2 text-sm"
                        }
                        aria-label={`Color scheme - ${scheme}`}
                        onClick={() => setColorScheme(scheme)}
                      >
                        {scheme === colorScheme ? (
                          <>
                            <IoColorPalette className="mr-2 size-4 rotate-0 scale-100 transition-all" />
                            {friendlyColorSchemeName(scheme)}
                          </>
                        ) : (
                          <span className="ml-6 mr-2">
                            {friendlyColorSchemeName(scheme)}
                          </span>
                        )}
                      </MenuItem>
                    ))}
                  </SubItemContent>
                </Portal>
              </SubItem>
            </DropdownMenuGroup>
            <DropdownMenuLabel className={isDesktop ? "mt-3" : "mt-1"}>
              Help
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <a href="https://docs.frigate.video" target="_blank">
              <MenuItem
                className={
                  isDesktop ? "cursor-pointer" : "flex items-center p-2 text-sm"
                }
                aria-label="Frigate documentation"
              >
                <LuLifeBuoy className="mr-2 size-4" />
                <span>Documentation</span>
              </MenuItem>
            </a>
            <a
              href="https://github.com/blakeblackshear/frigate"
              target="_blank"
            >
              <MenuItem
                className={
                  isDesktop ? "cursor-pointer" : "flex items-center p-2 text-sm"
                }
                aria-label="Frigate Github"
              >
                <LuGithub className="mr-2 size-4" />
                <span>GitHub</span>
              </MenuItem>
            </a>
            <DropdownMenuSeparator className={isDesktop ? "mt-3" : "mt-1"} />
            <MenuItem
              className={
                isDesktop ? "cursor-pointer" : "flex items-center p-2 text-sm"
              }
              aria-label="Restart Frigate"
              onClick={() => setRestartDialogOpen(true)}
            >
              <LuRotateCw className="mr-2 size-4" />
              <span>Restart Frigate</span>
            </MenuItem>
          </div>
        </Content>
      </Container>
      {restartDialogOpen && (
        <AlertDialog
          open={restartDialogOpen}
          onOpenChange={() => setRestartDialogOpen(false)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to restart Frigate?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setRestartingSheetOpen(true);
                  sendRestart("restart");
                }}
              >
                Restart
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {restartingSheetOpen && (
        <>
          <Sheet
            open={restartingSheetOpen}
            onOpenChange={() => setRestartingSheetOpen(false)}
          >
            <SheetContent
              side="top"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <div className="flex flex-col items-center">
                <ActivityIndicator />
                <SheetHeader className="mt-5 text-center">
                  <SheetTitle className="text-center">
                    Frigate is Restarting
                  </SheetTitle>
                  <SheetDescription className="text-center">
                    <p>This page will reload in {countdown} seconds.</p>
                  </SheetDescription>
                </SheetHeader>
                <Button
                  size="lg"
                  className="mt-5"
                  aria-label="Force reload now"
                  onClick={handleForceReload}
                >
                  Force Reload Now
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </>
  );
}
