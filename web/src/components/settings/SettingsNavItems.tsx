import {
  LuActivity,
  LuGithub,
  LuHardDrive,
  LuLifeBuoy,
  LuList,
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
import { VscAccount } from "react-icons/vsc";
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

type SettingsNavItemsProps = {
  className?: string;
};
export default function SettingsNavItems({ className }: SettingsNavItemsProps) {
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
      window.location.href = "/";
    }
  }, [countdown]);

  const handleForceReload = () => {
    window.location.href = "/";
  };

  return (
    <>
      <div className={className}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <a href="#">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <LuSettings />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Settings</p>
                </TooltipContent>
              </Tooltip>
            </a>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="md:w-72 mr-5">
            <DropdownMenuLabel>System</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link to="/storage">
                <DropdownMenuItem>
                  <LuHardDrive className="mr-2 h-4 w-4" />
                  <span>Storage</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/system">
                <DropdownMenuItem>
                  <LuActivity className="mr-2 h-4 w-4" />
                  <span>System metrics</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/logs">
                <DropdownMenuItem>
                  <LuList className="mr-2 h-4 w-4" />
                  <span>System logs</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuLabel className="mt-3">
              Configuration
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link to="/settings">
                <DropdownMenuItem>
                  <LuSettings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
              <Link to="/config">
                <DropdownMenuItem>
                  <LuPenSquare className="mr-2 h-4 w-4" />
                  <span>Configuration editor</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuLabel className="mt-3">Appearance</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <LuSunMoon className="mr-2 h-4 w-4" />
                  <span>Dark Mode</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      {theme === "light" ? (
                        <>
                          <LuSun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                          Light
                        </>
                      ) : (
                        <span className="mr-2 ml-6">Light</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      {theme === "dark" ? (
                        <>
                          <LuMoon className="mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                          Dark
                        </>
                      ) : (
                        <span className="mr-2 ml-6">Dark</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      {theme === "system" ? (
                        <>
                          <CgDarkMode className="mr-2 h-4 w-4 scale-100 transition-all" />
                          System
                        </>
                      ) : (
                        <span className="mr-2 ml-6">System</span>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <LuSunMoon className="mr-2 h-4 w-4" />
                  <span>Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    {colorSchemes.map((scheme) => (
                      <DropdownMenuItem
                        key={scheme}
                        onClick={() => setColorScheme(scheme)}
                      >
                        {scheme === colorScheme ? (
                          <>
                            <IoColorPalette className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all" />
                            {friendlyColorSchemeName(scheme)}
                          </>
                        ) : (
                          <span className="mr-2 ml-6">
                            {friendlyColorSchemeName(scheme)}
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuLabel className="mt-3">Help</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <a href="https://docs.frigate.video">
              <DropdownMenuItem>
                <LuLifeBuoy className="mr-2 h-4 w-4" />
                <span>Documentation</span>
              </DropdownMenuItem>
            </a>
            <a href="https://github.com/blakeblackshear/frigate">
              <DropdownMenuItem>
                <LuGithub className="mr-2 h-4 w-4" />
                <span>GitHub</span>
              </DropdownMenuItem>
            </a>
            <DropdownMenuSeparator className="mt-3" />
            <DropdownMenuItem onClick={() => setRestartDialogOpen(true)}>
              <LuRotateCw className="mr-2 h-4 w-4" />
              <span>Restart Frigate</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="icon" variant="ghost">
              <VscAccount />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Account</p>
          </TooltipContent>
        </Tooltip>
      </div>
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
                <Button size="lg" className="mt-5" onClick={handleForceReload}>
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
