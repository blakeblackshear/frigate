// Combobox widget for genai *.model fields.
// Fetches available models from the provider's backend and shows them in a dropdown.
import { useState, useMemo, useEffect, useRef } from "react";
import type { WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { getSizedFieldClassName } from "../utils";

/**
 * Extract the provider config entry name from the RJSF widget id.
 * Widget ids look like "root_myProvider_model".
 */
function getProviderKey(widgetId: string): string | undefined {
  const prefix = "root_";
  const suffix = "_model";

  if (!widgetId.startsWith(prefix) || !widgetId.endsWith(suffix)) {
    return undefined;
  }

  return widgetId.slice(prefix.length, -suffix.length) || undefined;
}

export function GenAIModelWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, options, registry } = props;
  const { t } = useTranslation(["views/settings"]);
  const [open, setOpen] = useState(false);

  const fieldClassName = getSizedFieldClassName(options, "sm");
  const providerKey = useMemo(() => getProviderKey(id), [id]);

  const formContext = registry?.formContext as ConfigFormContext | undefined;

  // Build a fingerprint from the saved config's provider + base_url so the
  // SWR key changes (and models are refetched) whenever those fields are saved.
  const configFingerprint = useMemo(() => {
    if (!providerKey) return "";
    const genai = (
      formContext?.fullConfig as Record<string, unknown> | undefined
    )?.genai;
    if (!genai || typeof genai !== "object" || Array.isArray(genai)) return "";
    const entry = (genai as Record<string, unknown>)[providerKey];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return "";
    const e = entry as Record<string, unknown>;
    return `${e.provider ?? ""}|${e.base_url ?? ""}`;
  }, [providerKey, formContext?.fullConfig]);

  const { data: allModels, mutate: mutateModels } = useSWR<
    Record<string, string[]>
  >("genai/models", {
    revalidateOnFocus: false,
  });

  // Revalidate models when the saved config fingerprint changes (e.g. after
  // switching provider or base_url and saving).
  const prevFingerprint = useRef(configFingerprint);
  useEffect(() => {
    if (configFingerprint !== prevFingerprint.current) {
      prevFingerprint.current = configFingerprint;
      mutateModels();
    }
  }, [configFingerprint, mutateModels]);

  const models = useMemo(() => {
    if (!allModels || !providerKey) return [];
    return allModels[providerKey] ?? [];
  }, [allModels, providerKey]);

  const currentLabel = typeof value === "string" && value ? value : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          {currentLabel ??
            t("configForm.genaiModel.placeholder", {
              ns: "views/settings",
              defaultValue: "Select model…",
            })}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={t("configForm.genaiModel.search", {
              ns: "views/settings",
              defaultValue: "Search models…",
            })}
          />
          <CommandList>
            {models.length > 0 ? (
              <CommandGroup>
                {models.map((model) => (
                  <CommandItem
                    key={model}
                    value={model}
                    onSelect={() => {
                      onChange(model);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === model ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {model}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {t("configForm.genaiModel.noModels", {
                  ns: "views/settings",
                  defaultValue: "No models available",
                })}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
