import { Button } from "@/components/ui/button";
import { useState } from "react";
import { isDesktop } from "react-device-detect";
import { cn } from "@/lib/utils";
import PlatformAwareDialog from "../overlay/dialog/PlatformAwareDialog";
import { FaCog } from "react-icons/fa";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import type { ShowStatsMode } from "@/types/chat";

type ChatSettingsProps = {
  showStats: ShowStatsMode;
  setShowStats: (mode: ShowStatsMode) => void;
  autoScroll: boolean;
  setAutoScroll: (enabled: boolean) => void;
};

export default function ChatSettings({
  showStats,
  setShowStats,
  autoScroll,
  setAutoScroll,
}: ChatSettingsProps) {
  const { t } = useTranslation(["views/chat"]);
  const [open, setOpen] = useState(false);

  const trigger = (
    <Button
      className="flex items-center md:gap-2"
      aria-label={t("settings.title")}
      size="sm"
    >
      <FaCog className="text-secondary-foreground" />
      <span className="hidden md:inline">{t("settings.title")}</span>
    </Button>
  );

  const content = (
    <div className="my-3 space-y-5 py-3 md:mt-0 md:py-0">
      <div className="space-y-3">
        <div className="space-y-0.5">
          <div className="text-md">{t("settings.show_stats.title")}</div>
          <div className="text-xs text-muted-foreground">
            {t("settings.show_stats.desc")}
          </div>
        </div>
        <Select
          value={showStats}
          onValueChange={(v) => setShowStats(v as ShowStatsMode)}
        >
          <SelectTrigger className="w-full">
            {showStats === "always"
              ? t("settings.show_stats.always")
              : t("settings.show_stats.while_generating")}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem className="cursor-pointer" value="while_generating">
                {t("settings.show_stats.while_generating")}
              </SelectItem>
              <SelectItem className="cursor-pointer" value="always">
                {t("settings.show_stats.always")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label htmlFor="auto-scroll" className="text-md cursor-pointer">
            {t("settings.auto_scroll.title")}
          </Label>
          <div className="text-xs text-muted-foreground">
            {t("settings.auto_scroll.desc")}
          </div>
        </div>
        <Switch
          id="auto-scroll"
          checked={autoScroll}
          onCheckedChange={setAutoScroll}
        />
      </div>
    </div>
  );

  return (
    <PlatformAwareDialog
      trigger={trigger}
      content={content}
      contentClassName={cn(
        "scrollbar-container h-auto overflow-y-auto",
        isDesktop ? "max-h-[80dvh] w-72" : "px-4",
      )}
      open={open}
      onOpenChange={setOpen}
    />
  );
}
