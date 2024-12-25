import {
  LuActivity,
  LuGithub,
  LuLanguages,
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

import { Link } from "react-router-dom";
import { CgDarkMode } from "react-icons/cg";
import {
  colorSchemes,
  friendlyColorSchemeName,
  useTheme,
} from "@/context/theme-provider";
import { IoColorPalette } from "react-icons/io5";

import { useState } from "react";
import { useRestart } from "@/api/ws";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import useSWR from "swr";
import RestartDialog from "../overlay/dialog/RestartDialog";
import { t } from "i18next";
import { Trans } from "react-i18next";
import { useLanguage } from "@/context/language-provider";

type GeneralSettingsProps = {
  className?: string;
};
export default function GeneralSettings({ className }: GeneralSettingsProps) {
  const { data: profile } = useSWR("profile");
  const { data: config } = useSWR("config");
  const logoutUrl = config?.proxy?.logout_url || "/api/logout";

  // settings

  const { language, setLanguage, systemLanguage } = useLanguage();
  const { theme, colorScheme, setTheme, setColorScheme } = useTheme();
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const { send: sendRestart } = useRestart();

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
                <p><Trans>ui.settings</Trans></p>
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
            <DropdownMenuLabel><Trans>ui.system</Trans></DropdownMenuLabel>
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
                  <span><Trans>ui.systemMetrics</Trans></span>
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
                  <span><Trans>ui.systemLogs</Trans></span>
                </MenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuLabel className={isDesktop ? "mt-3" : "mt-1"}>
              <Trans>ui.configuration</Trans>
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
                  <span><Trans>ui.settings</Trans></span>
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
                  <span><Trans>ui.configurationEditor</Trans></span>
                </MenuItem>
              </Link>
              <SubItem>
                <SubItemTrigger
                  className={
                    isDesktop
                      ? "cursor-pointer"
                      : "flex items-center p-2 text-sm"
                  }
                >
                  <LuLanguages className="mr-2 size-4" />
                  <span><Trans>ui.languages</Trans></span>
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
                      onClick={() => setLanguage("en")}
                    >
                      {language === "en" ? (
                        <>
                          <LuSun className="mr-2 size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                          <Trans>ui.language.en</Trans>
                        </>
                      ) : (
                        <span className="ml-6 mr-2"><Trans>ui.language.en</Trans></span>
                      )}
                    </MenuItem>
                    <MenuItem
                      className={
                        isDesktop
                          ? "cursor-pointer"
                          : "flex items-center p-2 text-sm"
                      }
                      aria-label="Dark mode"
                      onClick={() => setLanguage("zh-CN")}
                    >
                      {language === "zh-CN" ? (
                        <>
                          <LuMoon className="mr-2 size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                          <Trans>ui.language.zhCN</Trans>
                        </>
                      ) : (
                        <span className="ml-6 mr-2"><Trans>ui.language.zhCN</Trans></span>
                      )}
                    </MenuItem>
                    <MenuItem
                      className={
                        isDesktop
                          ? "cursor-pointer"
                          : "flex items-center p-2 text-sm"
                      }
                      aria-label="Use the system settings for light or dark mode"
                      onClick={() => setLanguage(systemLanguage)}
                    >
                      {language === systemLanguage ? (
                        <>
                          <CgDarkMode className="mr-2 size-4 scale-100 transition-all" />
                          <Trans>ui.withSystem</Trans>
                        </>
                      ) : (
                        <span className="ml-6 mr-2"><Trans>ui.withSystem</Trans></span>
                      )}
                    </MenuItem>
                  </SubItemContent>
                </Portal>
              </SubItem>
              <DropdownMenuLabel className={isDesktop ? "mt-3" : "mt-1"}>
                <Trans>ui.appearance</Trans>
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
                  <span><Trans>ui.darkMode</Trans></span>
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
                          <Trans>ui.darkMode.light</Trans>
                        </>
                      ) : (
                        <span className="ml-6 mr-2"><Trans>ui.darkMode.light</Trans></span>
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
                          <Trans>ui.darkMode.dark</Trans>
                        </>
                      ) : (
                        <span className="ml-6 mr-2"><Trans>ui.darkMode.dark</Trans></span>
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
                          <Trans>ui.withSystem</Trans>
                        </>
                      ) : (
                        <span className="ml-6 mr-2"><Trans>ui.withSystem</Trans></span>
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
                  <span><Trans>ui.theme</Trans></span>
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
                            <Trans>{friendlyColorSchemeName(scheme)}</Trans>
                          </>
                        ) : (
                          <span className="ml-6 mr-2">
                            <Trans>{friendlyColorSchemeName(scheme)}</Trans>
                          </span>
                        )}
                      </MenuItem>
                    ))}
                  </SubItemContent>
                </Portal>
              </SubItem>
            </DropdownMenuGroup>
            <DropdownMenuLabel className={isDesktop ? "mt-3" : "mt-1"}>
              <Trans>ui.help</Trans>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <a href="https://docs.frigate.video" target="_blank">
              <MenuItem
                className={
                  isDesktop ? "cursor-pointer" : "flex items-center p-2 text-sm"
                }
                aria-label={t("ui.documentation.label")}
              >
                <LuLifeBuoy className="mr-2 size-4" />
                <span><Trans>ui.documentation</Trans></span>
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
              aria-label={t("ui.restart")}
              onClick={() => setRestartDialogOpen(true)}
            >
              <LuRotateCw className="mr-2 size-4" />
              <span><Trans>ui.restart</Trans></span>
            </MenuItem>
          </div>
        </Content>
      </Container>
      <RestartDialog
        isOpen={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onRestart={() => sendRestart("restart")}
      />
    </>
  );
}
