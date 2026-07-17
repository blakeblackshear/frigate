// Combobox widget for genai *.model fields.
// Fetches available models from the provider's backend and shows them in a dropdown.
import { useState, useMemo, useEffect, useRef } from "react";
import type { WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import axios from "axios";
import { Check, ChevronsUpDown, Plus, RefreshCw } from "lucide-react";
import { LuCheck } from "react-icons/lu";
import { cn } from "@/lib/utils";
import ActivityIndicator from "@/components/indicators/activity-indicator";
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
import type { ConfigFormContext, JsonObject } from "@/types/configForm";
import type { GenAIModelsResponse } from "@/types/chat";
import { getSizedFieldClassName } from "../utils";

type ProbeResponse =
  | { success: true; models: string[] }
  | { success: false; message: string };

type ProbeStatus = "idle" | "probing" | "success" | "error";

const PROBE_SUCCESS_INDICATOR_MS = 3000;

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
  const [searchValue, setSearchValue] = useState("");

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

  const { data: allModels, mutate: mutateModels } = useSWR<GenAIModelsResponse>(
    "genai/models",
    {
      revalidateOnFocus: false,
    },
  );

  // Revalidate models when the saved config fingerprint changes (e.g. after
  // switching provider or base_url and saving).
  const prevFingerprint = useRef(configFingerprint);
  useEffect(() => {
    if (configFingerprint !== prevFingerprint.current) {
      prevFingerprint.current = configFingerprint;
      mutateModels();
    }
  }, [configFingerprint, mutateModels]);

  const fetchedModels = useMemo<string[]>(() => {
    if (!allModels || !providerKey) return [];
    return allModels[providerKey]?.models ?? [];
  }, [allModels, providerKey]);

  const [probeStatus, setProbeStatus] = useState<ProbeStatus>("idle");
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probedModels, setProbedModels] = useState<string[] | null>(null);
  const probeSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const probing = probeStatus === "probing";

  // Reset probe results if the provider entry name changes
  useEffect(() => {
    setProbedModels(null);
    setProbeError(null);
    setProbeStatus("idle");
    if (probeSuccessTimerRef.current) {
      clearTimeout(probeSuccessTimerRef.current);
      probeSuccessTimerRef.current = null;
    }
  }, [providerKey]);

  useEffect(() => {
    return () => {
      if (probeSuccessTimerRef.current) {
        clearTimeout(probeSuccessTimerRef.current);
      }
    };
  }, []);

  const models = probedModels ?? fetchedModels;

  const trimmedSearch = searchValue.trim();
  const matchesFetched = useMemo(
    () => models.some((m) => m.toLowerCase() === trimmedSearch.toLowerCase()),
    [models, trimmedSearch],
  );
  const showCustomOption = trimmedSearch.length > 0 && !matchesFetched;

  // Read the live form values for this provider so probe sends the user's
  // in-flight edits, not the saved config (which may not exist yet).
  const formEntry = useMemo<JsonObject | null>(() => {
    if (!providerKey) return null;
    const formData = formContext?.formData as JsonObject | undefined;
    const entry = formData?.[providerKey];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return null;
    }
    return entry as JsonObject;
  }, [providerKey, formContext?.formData]);

  const formProvider =
    typeof formEntry?.provider === "string" ? formEntry.provider : null;
  const canProbe = Boolean(formProvider) && !probing;

  const probe = async () => {
    if (!formEntry || !formProvider) return;
    if (probeSuccessTimerRef.current) {
      clearTimeout(probeSuccessTimerRef.current);
      probeSuccessTimerRef.current = null;
    }
    setProbeStatus("probing");
    setProbeError(null);
    try {
      const res = await axios.post<ProbeResponse>("genai/probe", {
        provider: formProvider,
        api_key:
          typeof formEntry.api_key === "string" ? formEntry.api_key : null,
        base_url:
          typeof formEntry.base_url === "string" ? formEntry.base_url : null,
        provider_options:
          formEntry.provider_options &&
          typeof formEntry.provider_options === "object" &&
          !Array.isArray(formEntry.provider_options)
            ? (formEntry.provider_options as JsonObject)
            : {},
      });
      if (res.data.success) {
        setProbedModels(res.data.models);
        setProbeStatus("success");
        probeSuccessTimerRef.current = setTimeout(() => {
          setProbeStatus("idle");
          probeSuccessTimerRef.current = null;
        }, PROBE_SUCCESS_INDICATOR_MS);
      } else {
        setProbedModels([]);
        setProbeError(res.data.message);
        setProbeStatus("error");
      }
    } catch {
      setProbedModels(null);
      setProbeError(
        t("configForm.genaiModel.probeFailed", {
          ns: "views/settings",
          defaultValue: "Failed to probe models",
        }),
      );
      setProbeStatus("error");
    }
  };

  const commit = (next: string) => {
    onChange(next);
    setSearchValue("");
    setOpen(false);
  };

  const currentLabel = typeof value === "string" && value ? value : undefined;

  const refreshLabel = t("configForm.genaiModel.refresh", {
    ns: "views/settings",
    defaultValue: "Refresh models",
  });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
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
                "min-w-0 justify-between font-normal",
                !currentLabel && "text-muted-foreground",
                fieldClassName,
              )}
            >
              <span className="truncate">
                {currentLabel ??
                  t("configForm.genaiModel.placeholder", {
                    ns: "views/settings",
                    defaultValue: "Select or enter a model…",
                  })}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput
                placeholder={t("configForm.genaiModel.search", {
                  ns: "views/settings",
                  defaultValue: "Search or enter a model…",
                })}
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
                      <Plus className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {t("configForm.genaiModel.useCustom", {
                          ns: "views/settings",
                          value: trimmedSearch,
                          defaultValue: 'Use "{{value}}"',
                        })}
                      </span>
                    </CommandItem>
                  </CommandGroup>
                )}
                {models.length > 0 ? (
                  <CommandGroup
                    heading={t("configForm.genaiModel.available", {
                      ns: "views/settings",
                      defaultValue: "Available models",
                    })}
                  >
                    {models.map((model) => (
                      <CommandItem
                        key={model}
                        value={model}
                        onSelect={() => commit(model)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4 shrink-0",
                            value === model ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="truncate">{model}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : !showCustomOption ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {t("configForm.genaiModel.noModels", {
                      ns: "views/settings",
                      defaultValue: "No models available",
                    })}
                  </div>
                ) : null}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!canProbe || disabled || readonly}
          onClick={probe}
          title={refreshLabel}
          aria-label={refreshLabel}
        >
          {probing ? (
            <ActivityIndicator className="h-4 w-4" size={16} />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div
        aria-live="polite"
        className={cn(
          "flex items-center justify-start gap-1 text-xs transition-opacity duration-200",
          probeStatus === "idle" || probeStatus === "probing"
            ? "opacity-0"
            : "opacity-100",
        )}
      >
        {probeStatus === "success" && (
          <span className="flex items-center gap-1 text-success">
            <LuCheck className="size-3.5" />
            {t("configForm.genaiModel.fetchedModels", {
              ns: "views/settings",
              defaultValue: "Successfully fetched model list",
            })}
          </span>
        )}
        {probeStatus === "error" && probeError && (
          <span className="text-destructive">{probeError}</span>
        )}
      </div>
    </div>
  );
}
