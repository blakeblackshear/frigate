import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Command,
  CommandEmpty,
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
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import type { StreamSourceMode } from "./streamSource";

type Go2rtcStreamComboboxProps = {
  id: string;
  value: string;
  options: string[];
  disabled?: boolean;
  onSelect: (streamName: string) => void;
};

// Searchable dropdown of existing go2rtc streams
function Go2rtcStreamCombobox({
  id,
  value,
  options,
  disabled,
  onSelect,
}: Go2rtcStreamComboboxProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const commit = (next: string) => {
    onSelect(next);
    setSearchValue("");
    setOpen(false);
  };

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
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal sm:max-w-xs",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {value ||
              t("configForm.cameraInputs.sourceMode.go2rtcStreamPlaceholder")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={t(
              "configForm.cameraInputs.sourceMode.go2rtcStreamSearch",
            )}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {t("configForm.cameraInputs.sourceMode.noMatchingStreams")}
            </CommandEmpty>
            <CommandGroup
              heading={t("configForm.cameraInputs.sourceMode.availableStreams")}
            >
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => commit(option)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type StreamSourceSelectorProps = {
  idPrefix: string;
  mode: StreamSourceMode;
  onModeChange: (mode: StreamSourceMode) => void;
  streamNames: string[];
  selectedStreamName: string;
  onSelectStream: (streamName: string) => void;
  manualField: ReactNode;
  disabled?: boolean;
  readonly?: boolean;
};

export function StreamSourceSelector({
  idPrefix,
  mode,
  onModeChange,
  streamNames,
  selectedStreamName,
  onSelectStream,
  manualField,
  disabled,
  readonly,
}: StreamSourceSelectorProps) {
  const { t } = useTranslation(["views/settings", "common"]);

  const restreamId = `${idPrefix}-source-restream`;
  const manualId = `${idPrefix}-source-manual`;
  const selectId = `${idPrefix}-restream-select`;

  const hasStreams = streamNames.length > 0;
  const isDisabled = disabled || readonly;

  return (
    <div className="space-y-3">
      <RadioGroup
        value={mode}
        onValueChange={(value) => onModeChange(value as StreamSourceMode)}
        className="flex flex-col gap-2 sm:flex-row sm:gap-6"
        disabled={isDisabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="restream"
            id={restreamId}
            className={
              mode === "restream"
                ? "bg-selected from-selected/50 to-selected/90 text-selected"
                : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
            }
          />
          <label htmlFor={restreamId} className="cursor-pointer text-sm">
            {t("configForm.cameraInputs.sourceMode.restream")}
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem
            value="manual"
            id={manualId}
            className={
              mode === "manual"
                ? "bg-selected from-selected/50 to-selected/90 text-selected"
                : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
            }
          />
          <label htmlFor={manualId} className="cursor-pointer text-sm">
            {t("configForm.cameraInputs.sourceMode.manual")}
          </label>
        </div>
      </RadioGroup>

      {mode === "restream" ? (
        <div className="space-y-2 pt-1">
          <Label htmlFor={selectId} className="block">
            {t("configForm.cameraInputs.sourceMode.go2rtcStreamLabel")}
          </Label>
          {hasStreams ? (
            <Go2rtcStreamCombobox
              id={selectId}
              value={selectedStreamName}
              options={streamNames}
              disabled={isDisabled}
              onSelect={onSelectStream}
            />
          ) : (
            <p
              className={cn(
                "rounded-md border border-dashed p-3 text-sm text-muted-foreground sm:max-w-xs",
              )}
            >
              {t("configForm.cameraInputs.sourceMode.noGo2rtcStreams")}
            </p>
          )}
        </div>
      ) : (
        manualField
      )}
    </div>
  );
}

export default StreamSourceSelector;
