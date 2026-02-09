import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuInfo, LuX } from "react-icons/lu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SaveAllPreviewItem = {
  scope: "global" | "camera";
  cameraName?: string;
  fieldPath: string;
  value: unknown;
};

type SaveAllPreviewPopoverProps = {
  items: SaveAllPreviewItem[];
  className?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
};

export default function SaveAllPreviewPopover({
  items,
  className,
  align = "end",
  side = "bottom",
}: SaveAllPreviewPopoverProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const [open, setOpen] = useState(false);
  const resetLabel = t("saveAllPreview.value.reset", {
    ns: "views/settings",
  });

  const formatValue = useCallback(
    (value: unknown) => {
      if (value === "") return resetLabel;
      if (typeof value === "string") return value;
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    },
    [resetLabel],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-8", className)}
          aria-label={t("saveAllPreview.triggerLabel", {
            ns: "views/settings",
          })}
        >
          <LuInfo className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={side}
        className="w-[90vw] max-w-sm border bg-background p-4 shadow-lg"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-primary-variant">
            {t("saveAllPreview.title", { ns: "views/settings" })}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setOpen(false)}
            aria-label={t("button.close", { ns: "common" })}
          >
            <LuX className="size-4" />
          </Button>
        </div>
        {items.length === 0 ? (
          <div className="mt-3 text-xs text-muted-foreground">
            {t("saveAllPreview.empty", { ns: "views/settings" })}
          </div>
        ) : (
          <div className="scrollbar-container mt-3 flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
            {items.map((item) => {
              const scopeLabel =
                item.scope === "global"
                  ? t("saveAllPreview.scope.global", {
                      ns: "views/settings",
                    })
                  : t("saveAllPreview.scope.camera", {
                      ns: "views/settings",
                      cameraName: item.cameraName,
                    });
              return (
                <div
                  key={`${item.scope}-${item.cameraName ?? "global"}-${
                    item.fieldPath
                  }`}
                  className="rounded-md border border-secondary bg-background_alt p-2"
                >
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">
                      {t("saveAllPreview.scope.label", {
                        ns: "views/settings",
                      })}
                    </span>
                    <span className="truncate">{scopeLabel}</span>
                    <span className="text-muted-foreground">
                      {t("saveAllPreview.field.label", {
                        ns: "views/settings",
                      })}
                    </span>
                    <span className="break-all font-mono">
                      {item.fieldPath}
                    </span>
                    <span className="text-muted-foreground">
                      {t("saveAllPreview.value.label", {
                        ns: "views/settings",
                      })}
                    </span>
                    <span className="whitespace-pre-wrap break-words font-mono">
                      {formatValue(item.value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
