// Combobox widget for ONVIF PTZ preset fields (e.g. autotracking.return_preset).
// Fetches the camera's PTZ presets and shows them in a dropdown, while still
// allowing a typed custom value so existing presets that the camera does not
// report (such as "home") are preserved.
import { useState, useMemo } from "react";
import type { WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ConfigFormContext } from "@/types/configForm";
import type { CameraPtzInfo } from "@/types/ptz";
import { getSizedFieldClassName } from "../utils";

export function PTZPresetsWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, options, registry } = props;
  const { t } = useTranslation(["views/settings"]);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const fieldClassName = getSizedFieldClassName(options, "md");

  const formContext = registry?.formContext as ConfigFormContext | undefined;
  const cameraName = formContext?.cameraName;
  const isCameraLevel = formContext?.level === "camera";
  const hasOnvifHost = !!formContext?.fullCameraConfig?.onvif?.host;

  const { data: ptzInfo } = useSWR<CameraPtzInfo>(
    isCameraLevel && cameraName && hasOnvifHost
      ? `${cameraName}/ptz/info`
      : null,
    {
      // ONVIF may not be initialized yet when the settings page loads,
      // so retry until presets become available
      refreshInterval: (data) =>
        data?.presets && data.presets.length > 0 ? 0 : 5000,
    },
  );

  const presets = useMemo<string[]>(() => ptzInfo?.presets ?? [], [ptzInfo]);

  const trimmedSearch = searchValue.trim();
  const matchesPreset = useMemo(
    () => presets.some((p) => p.toLowerCase() === trimmedSearch.toLowerCase()),
    [presets, trimmedSearch],
  );
  const showCustomOption = trimmedSearch.length > 0 && !matchesPreset;

  const commit = (next: string) => {
    onChange(next);
    setSearchValue("");
    setOpen(false);
  };

  const currentLabel = typeof value === "string" && value ? value : undefined;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearchValue("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || readonly}
          className={cn(
            "justify-between font-normal",
            !currentLabel && "text-muted-foreground",
            fieldClassName,
          )}
        >
          {currentLabel ?? t("configForm.ptzPresets.placeholder")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={t("configForm.ptzPresets.search")}
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={(e) => {
              if (e.key === "Enter" && showCustomOption) {
                e.preventDefault();
                commit(trimmedSearch);
              }
            }}
          />
          <CommandList>
            {showCustomOption && (
              <CommandGroup>
                <CommandItem
                  value={trimmedSearch}
                  onSelect={() => commit(trimmedSearch)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("configForm.ptzPresets.useCustom", {
                    value: trimmedSearch,
                  })}
                </CommandItem>
              </CommandGroup>
            )}
            {presets.length > 0 ? (
              <CommandGroup heading={t("configForm.ptzPresets.available")}>
                {presets.map((preset) => (
                  <CommandItem
                    key={preset}
                    value={preset}
                    onSelect={() => commit(preset)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === preset ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {preset}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : !showCustomOption ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("configForm.ptzPresets.noPresets")}
              </div>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
