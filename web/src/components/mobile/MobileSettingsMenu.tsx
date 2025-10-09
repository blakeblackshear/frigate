import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useOptimisticState from "@/hooks/use-optimistic-state";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import Logo from "@/components/Logo";
import { SettingsType } from "@/types/settings";

type SettingsGroup = {
  label: string;
  items: { key: string }[];
};

type MobileSettingsMenuProps = {
  settingsGroups: SettingsGroup[];
  visibleSettingsViews: readonly string[];
  onSelect: (key: string) => void;
  isAdmin: boolean;
  allowedViewsForViewer: readonly string[];
  setPageToggle: (page: SettingsType) => void;
};

export default function MobileSettingsMenu({
  settingsGroups,
  visibleSettingsViews,
  onSelect,
  isAdmin,
  allowedViewsForViewer,
  setPageToggle,
}: MobileSettingsMenuProps) {
  const { t } = useTranslation(["views/settings"]);
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);
  const [currentGroupToggle, setCurrentGroupToggle] = useOptimisticState(
    currentGroup,
    setCurrentGroup,
    100,
  );

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // only handle the pop state for our submenu nav
      // mobile pages are handled separately
      if (currentGroupToggle && !event.state?.submenu) {
        event.preventDefault();
        setCurrentGroupToggle(null);
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentGroupToggle, setCurrentGroupToggle]);

  const handleGroupClick = (group: SettingsGroup) => {
    const filteredItems = group.items.filter((item) =>
      visibleSettingsViews.includes(item.key),
    );
    if (filteredItems.length === 1) {
      // Navigate directly
      const key = filteredItems[0].key;
      if (!isAdmin && !allowedViewsForViewer.includes(key)) {
        setPageToggle("ui");
      } else {
        setPageToggle(key as SettingsType);
      }
      onSelect(key);
    } else {
      // Show submenu
      window.history.pushState({ submenu: true }, "", window.location.pathname);
      setCurrentGroupToggle(group.label);
    }
  };

  const handleItemClick = (key: string) => {
    if (!isAdmin && !allowedViewsForViewer.includes(key)) {
      setPageToggle("ui");
    } else {
      setPageToggle(key as SettingsType);
    }
    onSelect(key);
  };

  return (
    <div className="flex size-full flex-col">
      <div className="sticky -top-2 z-50 mb-2 bg-background p-4">
        <div className="flex items-center justify-center">
          <Logo className="h-8" />
        </div>
        <div className="flex flex-row text-center">
          {currentGroupToggle ? (
            <button
              className="ml-1 mt-4 flex items-center text-lg smart-capitalize hover:underline"
              onClick={() => setCurrentGroupToggle(null)}
            >
              <LuChevronLeft className="mr-2 size-4" />
              {t("menu." + currentGroupToggle.toLowerCase())}
            </button>
          ) : (
            <h2 className="ml-1 mt-4 text-lg">
              {t("menu.settings", { ns: "common" })}
            </h2>
          )}
        </div>
      </div>

      <div className="relative flex-1">
        <AnimatePresence>
          {currentGroupToggle ? (
            <motion.div
              key="submenu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="scrollbar-container absolute inset-0 overflow-y-auto px-1"
            >
              {(() => {
                const group = settingsGroups.find(
                  (g) => g.label === currentGroupToggle,
                );
                if (!group) return null;
                const filteredItems = group.items.filter((item) =>
                  visibleSettingsViews.includes(item.key),
                );
                return filteredItems.map((item) => (
                  <Button
                    key={item.key}
                    variant="ghost"
                    className="w-full justify-between hover:bg-transparent hover:text-muted-foreground"
                    onClick={() => handleItemClick(item.key)}
                  >
                    <div className="smart-capitalize">
                      {t("menu." + item.key)}
                    </div>
                    <LuChevronRight className="size-4" />
                  </Button>
                ));
              })()}
            </motion.div>
          ) : (
            <motion.div
              key="main"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="scrollbar-container absolute inset-0 overflow-y-auto px-1"
            >
              {settingsGroups.map((group) => {
                const filteredItems = group.items.filter((item) =>
                  visibleSettingsViews.includes(item.key),
                );
                if (filteredItems.length === 0) return null;
                return (
                  <Button
                    key={group.label}
                    variant="ghost"
                    className="mb-2 w-full justify-between hover:bg-transparent hover:text-muted-foreground"
                    onClick={() => handleGroupClick(group)}
                  >
                    <div className="smart-capitalize">
                      {t("menu." + group.label.toLowerCase())}
                    </div>
                    <LuChevronRight className="size-4" />
                  </Button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
