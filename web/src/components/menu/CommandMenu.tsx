import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { isMacOs } from "react-device-detect";
import type { IconType } from "react-icons";
import { FaVideo } from "react-icons/fa";
import { MdVideoLibrary } from "react-icons/md";
import {
  LuActivity,
  LuFileCode,
  LuLayers,
  LuList,
  LuRotateCw,
  LuSettings,
  LuSunMoon,
} from "react-icons/lu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import RestartDialog from "@/components/overlay/dialog/RestartDialog";
import { useRestart } from "@/api/ws";
import { useTheme } from "@/context/theme-provider";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { resolveCameraName } from "@/hooks/use-camera-friendly-name";
import { useIsAdmin } from "@/hooks/use-is-admin";
import useNavigation from "@/hooks/use-navigation";
import { useHasFullCameraAccess } from "@/hooks/use-has-full-camera-access";
import { useUserPersistence } from "@/hooks/use-user-persistence";
import { FrigateConfig } from "@/types/frigateConfig";
import { settingsViewGroups, ALLOWED_VIEWS_FOR_VIEWER } from "@/types/settings";

const SECTIONS = [
  "pages",
  "cameras",
  "cameraGroups",
  "settings",
  "actions",
] as const;

type CommandSection = (typeof SECTIONS)[number];

type MenuCommand = {
  id: string;
  section: CommandSection;
  title: string;
  /** Trailing text that tells two commands with the same title apart. */
  detail?: string;
  terms: string[];
  Icon: IconType;
  onRun: () => void;
};

type MenuPage = {
  icon: IconType;
  /** Key in the `common` namespace. */
  title: string;
  url: string;
  adminOnly?: boolean;
};

// Pages the sidebar reaches through its settings menu rather than useNavigation.
const MENU_PAGES: MenuPage[] = [
  { icon: LuSettings, title: "menu.settings", url: "/settings" },
  {
    icon: LuActivity,
    title: "menu.systemMetrics",
    url: "/system#general",
    adminOnly: true,
  },
  {
    icon: LuFileCode,
    title: "menu.configurationEditor",
    url: "/config",
    adminOnly: true,
  },
  { icon: LuList, title: "menu.systemLogs", url: "/logs", adminOnly: true },
];

const RECENT_LIMIT = 6;
const NO_RECENT: string[] = [];

/**
 * Search box over pages, cameras, camera groups, settings sections and a few
 * actions. Mounted once for the whole app and opened with the keyboard.
 */
export default function CommandMenu() {
  const { t } = useTranslation(["common", "views/settings"]);
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const allowedCameras = useAllowedCameras();
  const hasFullCameraAccess = useHasFullCameraAccess();
  const navPages = useNavigation();
  const { theme, systemTheme, setTheme } = useTheme();
  const { send: sendRestart } = useRestart();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [recent, setRecent] = useUserPersistence<string[]>(
    "command-menu-recent",
    NO_RECENT,
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
        return;
      }

      const target = event.target;
      const editing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        // Monaco reads Ctrl+K as the start of a chord, and every other text
        // field may want it too, so only claim it outside of one.
        if (editing && !open) {
          return;
        }

        event.preventDefault();
        setOpen(!open);
      } else if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !editing &&
        !open
      ) {
        event.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const toggleTheme = useCallback(() => {
    const active = theme === "system" ? systemTheme : theme;
    setTheme(active === "dark" ? "light" : "dark");
  }, [theme, systemTheme, setTheme]);

  const commands = useMemo<MenuCommand[]>(() => {
    const goTo = (url: string) => () => navigate(url);
    const built: MenuCommand[] = [];

    const pages: MenuPage[] = [
      ...navPages.filter((page) => page.enabled !== false),
      ...MENU_PAGES.filter((page) => !page.adminOnly || isAdmin),
    ];

    for (const page of pages) {
      built.push({
        id: `page-${page.url}`,
        section: "pages",
        title: t(page.title),
        terms: [page.url],
        Icon: page.icon,
        onRun: goTo(page.url),
      });
    }

    for (const camera of allowedCameras) {
      const title = resolveCameraName(config, camera);

      built.push({
        id: `camera-live-${camera}`,
        section: "cameras",
        title,
        detail: t("commandMenu.camera.live"),
        terms: [camera],
        Icon: FaVideo,
        onRun: goTo(`/#${camera}`),
      });
      built.push({
        id: `camera-review-${camera}`,
        section: "cameras",
        title,
        detail: t("commandMenu.camera.review"),
        terms: [camera],
        Icon: MdVideoLibrary,
        onRun: goTo(`/review?cameras=${encodeURIComponent(camera)}`),
      });
    }

    for (const [group, groupConfig] of Object.entries(
      config?.camera_groups ?? {},
    )) {
      // A custom role only gets groups it can actually open, and only the
      // cameras it may see become search terms.
      const groupCameras = hasFullCameraAccess
        ? groupConfig.cameras
        : groupConfig.cameras.filter((camera) =>
            allowedCameras.includes(camera),
          );

      if (groupCameras.length === 0) {
        continue;
      }

      built.push({
        id: `group-${group}`,
        section: "cameraGroups",
        title: group,
        terms: groupCameras,
        Icon: LuLayers,
        onRun: goTo(`/?group=${encodeURIComponent(group)}`),
      });
    }

    for (const group of settingsViewGroups) {
      for (const view of group.views) {
        if (!isAdmin && !ALLOWED_VIEWS_FOR_VIEWER.includes(view)) {
          continue;
        }

        built.push({
          id: `settings-${view}`,
          section: "settings",
          // Section names repeat across groups, so the group name comes along
          // to tell "Object detection" under cameras from the global one.
          title: t(`menu.${view}`, { ns: "views/settings" }),
          detail: t(`menu.${group.label}`, { ns: "views/settings" }),
          terms: [view],
          Icon: LuSettings,
          onRun: goTo(`/settings?page=${view}`),
        });
      }
    }

    built.push({
      id: "theme",
      section: "actions",
      title: t("commandMenu.action.toggleTheme"),
      terms: ["dark", "light", "appearance"],
      Icon: LuSunMoon,
      onRun: toggleTheme,
    });

    if (isAdmin) {
      built.push({
        id: "restart",
        section: "actions",
        title: t("menu.restart"),
        terms: ["reboot"],
        Icon: LuRotateCw,
        onRun: () => setConfirmRestart(true),
      });
    }

    return built;
  }, [
    t,
    navigate,
    isAdmin,
    config,
    allowedCameras,
    hasFullCameraAccess,
    navPages,
    toggleTheme,
  ]);

  const recentCommands = useMemo(
    () =>
      (recent ?? NO_RECENT)
        .map((id) => commands.find((command) => command.id === id))
        .filter((command): command is MenuCommand => command !== undefined),
    [recent, commands],
  );

  const run = useCallback(
    (command: MenuCommand) => {
      setRecent(
        [
          command.id,
          ...(recent ?? NO_RECENT).filter((id) => id !== command.id),
        ].slice(0, RECENT_LIMIT),
      );
      setOpen(false);
      setSearch("");
      command.onRun();
    },
    [recent, setRecent],
  );

  const renderCommand = (command: MenuCommand, idPrefix = "") => (
    <CommandItem
      key={idPrefix + command.id}
      value={idPrefix + command.id}
      keywords={[command.title, ...command.terms]}
      onSelect={() => run(command)}
      className="cursor-pointer gap-2"
    >
      <command.Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{command.title}</span>
      {command.detail && <CommandShortcut>{command.detail}</CommandShortcut>}
    </CommandItem>
  );

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("commandMenu.title")}
        description={t("commandMenu.description")}
        className="top-[15%] translate-y-0 sm:max-w-lg"
      >
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder={t("commandMenu.placeholder")}
        />
        <CommandList className="max-h-[50vh]">
          <CommandEmpty>{t("commandMenu.empty")}</CommandEmpty>
          {search === "" && recentCommands.length > 0 && (
            <CommandGroup heading={t("commandMenu.section.recent")}>
              {recentCommands.map((command) =>
                renderCommand(command, "recent-"),
              )}
            </CommandGroup>
          )}
          {SECTIONS.map((section) => {
            const inSection = commands.filter(
              (command) => command.section === section,
            );

            if (inSection.length === 0) {
              return null;
            }

            return (
              <CommandGroup
                key={section}
                heading={t(`commandMenu.section.${section}`)}
              >
                {inSection.map((command) => renderCommand(command))}
              </CommandGroup>
            );
          })}
        </CommandList>
        <div className="border-t px-3 py-2 text-xs text-muted-foreground">
          {t("commandMenu.hint", { key: isMacOs ? "⌘K" : "Ctrl+K" })}
        </div>
      </CommandDialog>
      <RestartDialog
        isOpen={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        onRestart={() => sendRestart("restart")}
      />
    </>
  );
}
