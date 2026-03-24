// Combobox widget for semantic_search.model field.
// Shows built-in model enum values and GenAI providers with the embeddings role.
import { useState, useMemo } from "react";
import type { WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
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

interface ProviderOption {
  value: string;
  label: string;
}

export function SemanticSearchModelWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, schema, registry, options } =
    props;
  const { t } = useTranslation(["views/settings"]);
  const [open, setOpen] = useState(false);

  const formContext = registry?.formContext as ConfigFormContext | undefined;
  const fieldClassName = getSizedFieldClassName(options, "sm");

  // Built-in model options from schema.examples (populated by transformer
  // collapsing the anyOf enum+string union)
  const builtInModels: ProviderOption[] = useMemo(() => {
    const examples = (schema as Record<string, unknown>).examples;
    if (!Array.isArray(examples)) return [];
    return examples
      .filter((v): v is string => typeof v === "string")
      .map((v) => ({ value: v, label: v }));
  }, [schema]);

  // GenAI providers that have the "embeddings" role
  const embeddingsProviders: ProviderOption[] = useMemo(() => {
    const genai = (
      formContext?.fullConfig as Record<string, unknown> | undefined
    )?.genai;
    if (!genai || typeof genai !== "object" || Array.isArray(genai)) return [];

    const providers: ProviderOption[] = [];
    for (const [key, config] of Object.entries(
      genai as Record<string, unknown>,
    )) {
      if (!config || typeof config !== "object" || Array.isArray(config))
        continue;
      const roles = (config as Record<string, unknown>).roles;
      if (Array.isArray(roles) && roles.includes("embeddings")) {
        providers.push({ value: key, label: key });
      }
    }
    return providers;
  }, [formContext?.fullConfig]);

  const currentLabel =
    builtInModels.find((m) => m.value === value)?.label ??
    embeddingsProviders.find((p) => p.value === value)?.label ??
    (typeof value === "string" && value ? value : undefined);

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
            t("configForm.semanticSearchModel.placeholder", {
              ns: "views/settings",
              defaultValue: "Select model…",
            })}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandList>
            {builtInModels.length > 0 && (
              <CommandGroup
                heading={t("configForm.semanticSearchModel.builtIn", {
                  ns: "views/settings",
                  defaultValue: "Built-in Models",
                })}
              >
                {builtInModels.map((model) => (
                  <CommandItem
                    key={model.value}
                    value={model.value}
                    onSelect={() => {
                      onChange(model.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === model.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {model.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {embeddingsProviders.length > 0 && (
              <CommandGroup
                heading={t("configForm.semanticSearchModel.genaiProviders", {
                  ns: "views/settings",
                  defaultValue: "GenAI Providers",
                })}
              >
                {embeddingsProviders.map((provider) => (
                  <CommandItem
                    key={provider.value}
                    value={provider.value}
                    onSelect={() => {
                      onChange(provider.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === provider.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {provider.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
