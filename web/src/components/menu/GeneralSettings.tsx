import {
  LuActivity,
  LuGithub,
  LuLanguages,
  LuLifeBuoy,
  LuList,
  LuLogOut,
  LuMoon,
  LuSquarePen,
  LuScanFace,
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
import { useMemo, useState } from "react";
import { useRestart } from "@/api/ws";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop, isMobile } from "react-device-detect";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import RestartDialog from "../overlay/dialog/RestartDialog";

import { useLanguage } from "@/context/language-provider";
import { useIsAdmin } from "@/hooks/use-is-admin";
import SetPasswordDialog from "../overlay/SetPasswordDialog";
import { toast } from "sonner";
import axios from "axios";
import { FrigateConfig } from "@/types/frigateConfig";
import { useTranslation } from "react-i18next";
import { supportedLanguageKeys } from "@/lib/const";

import { useDocDomain } from "@/hooks/use-doc-domain";
import { MdCategory } from "react-icons/md";

type GeneralSettingsProps = {
  className?: string;
};

export default function GeneralSettings({ className }: GeneralSettingsProps) {
  const { t } = useTranslation(["common", "views/settings"]);
  const { getLocaleDocUrl } = useDocDomain();
  const { data: profile } = useSWR("profile");
  const { data: config } = useSWR<FrigateConfig>("config");
  const logoutUrl = config?.proxy?.logout_url || "/api/logout";

  // languages

  const languages = useMemo(() => {
    // Handle language keys that aren't directly used for translation key
    const specialKeyMap: { [key: string]: string } = {
      "nb-NO": "nb",
      "yue-Hant": "yue",
      "zh-CN": "zhCN",
      "pt-BR": "ptBR",
    };

    return supportedLanguageKeys.map((key) => {
      return {
        code: key,
        label: t(`menu.language.${specialKeyMap[key] || key}`),
      };
    });
  }, [t]);

  // settings

  const { language, setLanguage } = useLanguage();
  const { theme, colorScheme, setTheme, setColorScheme } = useTheme();
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const { send: sendRestart } = useRestart();

  const isAdmin = useIsAdmin();

  const Container = isDesktop ? DropdownMenu : Drawer;
  const Trigger = isDesktop ? DropdownMenuTrigger : DrawerTrigger;
  const Content = isDesktop ? DropdownMenuContent : DrawerContent;
  const MenuItem = isDesktop ? DropdownMenuItem : DialogClose;
  const SubItem = isDesktop ? DropdownMenuSub : Dialog;
  const SubItemTrigger = isDesktop ? DropdownMenuSubTrigger : DialogTrigger;
  const SubItemContent = isDesktop ? DropdownMenuSubContent : DialogContent;
  const Portal = isDesktop ? DropdownMenuPortal : DialogPortal;

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

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
          toast.success(
            t("users.toast.success.updatePassword", {
              ns: "views/settings",
            }),
            {
              position: "top-center",
            },
          );
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
                <p>{t("menu.settings")}</p>
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
          {!isDesktop && (
            <>
              <DrawerTitle className="sr-only">
                {t("menu.settings")}
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                {t("menu.settings")}
              </DrawerDescription>
            </>
          )}
          <div className="scrollbar-container w-full flex-col overflow-y-auto overflow-x-hidden">
            {isMobile && (
              <div className="mb-2">
                <DropdownMenuLabel>
                  {t("menu.user.current", {
                    user: profile?.username || t("menu.user.anonymous"),
                  })}{" "}
                  {t("role." + profile?.role) &&
                    `(${t("role." + profile?.role)})`}
                </DropdownMenuLabel>
                <DropdownMenuSeparator
                  className={isDesktop ? "mt-3" : "mt-1"}
                />
                {profile?.username && profile.username !== "anonymous" && (
                  <MenuItem
                    className={
                      isDesktop
                        ? "cursor-pointer"
                        : "flex items-center p-2 text-sm"
                    }
                    aria-label={t("menu.user.setPassword", { ns: "common" })}
                    onClick={() => setPasswordDialogOpen(true)}
                  >
                    <LuSquarePen className="mr-2 size-4" />
                    <span>{t("menu.user.setPassword", { ns: "common" })}</span>
                  </MenuItem>
                )}
                <MenuItem
                  className={
                    isDesktop
                      ? "cursor-pointer"
                      : "flex items-center p-2 text-sm"
                  }
                  aria-label={t("menu.user.logout", { ns: "common" })}
                >
                  <a className="flex" href={logoutUrl}>
                    <LuLogOut className="mr-2 size-4" />
                    <span>{t("menu.user.logout", { ns: "common" })}</span>
                  </a>
                </MenuItem>
              </div>
            )}
            {isAdmin && (
              <>
                <DropdownMenuLabel>{t("menu.system")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup className={isDesktop ? "" : "flex flex-col"}>
                  <Link to="/system#general">
                    <MenuItem
                      className={
                        isDesktop
                          ? "cursor-pointer"
                          : "flex w-full items-center p-2 text-sm"
                      }
                      aria-label={t("menu.systemMetrics")}
                    >
                      <LuActivity className="mr-2 size-4" />
                      <span>{t("menu.systemMetrics")}</span>
                    </MenuItem>
                  </Link>
                  <Link to="/logs">
                    <MenuItem
                      className={
                        isDesktop
                          ? "cursor-pointer"
                          : "flex w-full items-center p-2 text-sm"
                      }
                      aria-label={t("menu.systemLogs")}
                    >
                      <LuList className="mr-2 size-4" />
                      <span>{t("menu.systemLogs")}</span>
                    </MenuItem>
                  </Link>
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuLabel
              className={isDesktop && isAdmin ? "mt-3" : "mt-1"}
            >
              {t("menu.configuration")}
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
                  aria-label={t("menu.settings")}
                >
                  <LuSettings className="mr-2 size-4" />
                  <span>{t("menu.settings")}</span>
                </MenuItem>
              </Link>
              {isAdmin && (
                <>
                  <Link to="/config">
                    <MenuItem
                      className={
                        isDesktop
                          ? "cursor-pointer"
                          : "flex w-full items-center p-2 text-sm"
                      }
                      aria-label={t("menu.configurationEditor")}
                    >
                      <LuSquarePen className="mr-2 size-4" />
                      <span>{t("menu.configurationEditor")}</span>
                    </MenuItem>
                  </Link>
                </>
              )}
              {isAdmin && isMobile && config?.face_recognition.enabled && (
                <>
                  <Link to="/faces">
                    <MenuItem
                      className="flex w-full items-center p-2 text-sm"
                      aria-label={t("menu.faceLibrary")}
                    >
                      <LuScanFace className="mr-2 size-4" />
                      <span>{t("menu.faceLibrary")}</span>
                    </MenuItem>
                  </Link>
                </>
              )}
              {isAdmin && isMobile && (
                <>
                  <Link to="/classification">
                    <MenuItem
                      className="flex w-full items-center p-2 text-sm"
                      aria-label={t("menu.classification")}
                    >
                      <MdCategory className="mr-2 size-4" />
                      <span>{t("menu.classification")}</span>
                    </MenuItem>
                  </Link>
                </>
              )}
            </DropdownMenuGroup>
            <DropdownMenuLabel className={isDesktop ? "mt-3" : "mt-1"}>
              {t("menu.appearance")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <SubItem>
              <SubItemTrigger
                className={
                  isDesktop ? "cursor-pointer" : "flex items-center p-2 text-sm"
                }
              >
                <LuLanguages className="mr-2 size-4" />
                <span>{t("menu.languages")}</span>
              </SubItemTrigger>
              <Portal>
                <SubItemContent
                  className={
                    isDesktop
                      ? ""
                      : "scrollbar-container max-h-[75dvh] w-[92%] overflow-y-scroll rounded-lg md:rounded-2xl"
                  }
                >
                  {!isDesktop && (
                    <>
                      <DialogTitle className="sr-only">
                        {t("menu.languages")}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        {t("menu.languages")}
                      </DialogDescription>
                    </>
                  )}
                  <span tabIndex={0} className="sr-only" />
                  {languages.map(({ code, label }) => (
                    <MenuItem
                      key={code}
                      className={
                        isDesktop
                          ? "cursor-pointer"
                          : "flex items-center p-2 text-sm"
                      }
                      aria-label={label}
                      onClick={() => setLanguage(code)}
                    >
                      {language.trim() === code ? (
                        <>
                          <LuLanguages className="mr-2 size-4" />
                          {label}
                        </>
                      ) : (
                        <span className="ml-6 mr-2">{label}</span>
                      )}
                    </MenuItem>
                  ))}
                </SubItemContent>
              </Portal>
            </SubItem>
            <SubItem>
              <SubItemTrigger
                className={
                  isDesktop ? "cursor-pointer" : "flex items-center p-2 text-sm"
                }
              >
                <LuSunMoon className="mr-2 size-4" />
                <span>{t("menu.darkMode.label")}</span>
              </SubItemTrigger>
              <Portal>
                <SubItemContent
                  className={
                    isDesktop ? "" : "w-[92%] rounded-lg md:rounded-2xl"
                  }
                >
                  {!isDesktop && (
                    <>
                      <DialogTitle className="sr-only">
                        {t("menu.darkMode.label")}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        {t("menu.darkMode.label")}
                      </DialogDescription>
                    </>
                  )}
                  <span tabIndex={0} className="sr-only" />
                  <MenuItem
                    className={
                      isDesktop
                        ? "cursor-pointer"
                        : "flex items-center p-2 text-sm"
                    }
                    aria-label={t("menu.darkMode.light")}
                    onClick={() => setTheme("light")}
                  >
                    {theme === "light" ? (
                      <>
                        <LuSun className="mr-2 size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        {t("menu.darkMode.light")}
                      </>
                    ) : (
                      <span className="ml-6 mr-2">
                        {t("menu.darkMode.light")}
                      </span>
                    )}
                  </MenuItem>
                  <MenuItem
                    className={
                      isDesktop
                        ? "cursor-pointer"
                        : "flex items-center p-2 text-sm"
                    }
                    aria-label={t("menu.darkMode.dark")}
                    onClick={() => setTheme("dark")}
                  >
                    {theme === "dark" ? (
                      <>
                        <LuMoon className="mr-2 size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        {t("menu.darkMode.dark")}
                      </>
                    ) : (
                      <span className="ml-6 mr-2">
                        {t("menu.darkMode.dark")}
                      </span>
                    )}
                  </MenuItem>
                  <MenuItem
                    className={
                      isDesktop
                        ? "cursor-pointer"
                        : "flex items-center p-2 text-sm"
                    }
                    aria-label={t("menu.darkMode.withSystem.label")}
                    onClick={() => setTheme("system")}
                  >
                    {theme === "system" ? (
                      <>
                        <CgDarkMode className="mr-2 size-4 scale-100 transition-all" />
                        {t("menu.withSystem")}
                      </>
                    ) : (
                      <span className="ml-6 mr-2">{t("menu.withSystem")}</span>
                    )}
                  </MenuItem>
                </SubItemContent>
              </Portal>
            </SubItem>
            <SubItem>
              <SubItemTrigger
                className={
                  isDesktop ? "cursor-pointer" : "flex items-center p-2 text-sm"
                }
              >
                <LuSunMoon className="mr-2 size-4" />
                <span>{t("menu.theme.label")}</span>
              </SubItemTrigger>
              <Portal>
                <SubItemContent
                  className={
                    isDesktop ? "" : "w-[92%] rounded-lg md:rounded-2xl"
                  }
                >
                  {!isDesktop && (
                    <>
                      <DialogTitle className="sr-only">
                        {t("menu.theme.label")}
                      </DialogTitle>
                      <DialogDescription className="sr-only">
                        {t("menu.theme.label")}
                      </DialogDescription>
                    </>
                  )}
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
                          {t(friendlyColorSchemeName(scheme))}
                        </>
                      ) : (
                        <span className="ml-6 mr-2">
                          {t(friendlyColorSchemeName(scheme))}
                        </span>
                      )}
                    </MenuItem>
                  ))}
                </SubItemContent>
              </Portal>
            </SubItem>
            <DropdownMenuLabel className={isDesktop ? "mt-3" : "mt-1"}>
              {t("menu.help")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <a href={getLocaleDocUrl("/")} target="_blank">
              <MenuItem
                className={
                  isDesktop ? "cursor-pointer" : "flex items-center p-2 text-sm"
                }
                aria-label={t("menu.documentation.label")}
              >
                <LuLifeBuoy className="mr-2 size-4" />
                <span>{t("menu.documentation.title")}</span>
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
            {isAdmin && (
              <>
                <DropdownMenuSeparator
                  className={isDesktop ? "mt-3" : "mt-1"}
                />
                <MenuItem
                  className={
                    isDesktop
                      ? "cursor-pointer"
                      : "flex items-center p-2 text-sm"
                  }
                  aria-label={t("menu.restart")}
                  onClick={() => setRestartDialogOpen(true)}
                >
                  <LuRotateCw className="mr-2 size-4" />
                  <span>{t("menu.restart")}</span>
                </MenuItem>
              </>
            )}
          </div>
        </Content>
      </Container>
      <RestartDialog
        isOpen={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onRestart={() => sendRestart("restart")}
      />
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
    </>
  );
}
