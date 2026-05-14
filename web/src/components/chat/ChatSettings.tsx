import { Button } from "@/components/ui/button";
import { useState } from "react";
import { isDesktop } from "react-device-detect";
import { cn } from "@/lib/utils";
import PlatformAwareDialog from "../overlay/dialog/PlatformAwareDialog";
import { FaCog } from "react-icons/fa";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
      className="flex items-center gap-2"
      aria-label={t("settings.title")}
      size="sm"
    >
      <FaCog className="text-secondary-foreground" />
      {t("settings.title")}
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
        <RadioGroup
          value={showStats}
          onValueChange={(v) => setShowStats(v as ShowStatsMode)}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem
              id="show-stats-while-generating"
              value="while_generating"
            />
            <Label
              htmlFor="show-stats-while-generating"
              className="cursor-pointer text-sm"
            >
              {t("settings.show_stats.while_generating")}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem id="show-stats-always" value="always" />
            <Label
              htmlFor="show-stats-always"
              className="cursor-pointer text-sm"
            >
              {t("settings.show_stats.always")}
            </Label>
          </div>
        </RadioGroup>
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
