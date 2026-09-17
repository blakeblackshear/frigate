import type { WidgetProps } from "@rjsf/utils";
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { Switch } from "@/components/ui/switch";
import type { ConfigFormContext } from "@/types/configForm";
import type { GenAIModelCapabilities, GenAIModelsResponse } from "@/types/chat";

const GENAI_ROLES = [
  "embeddings",
  "descriptions",
  "chat",
  "transcribe",
] as const;

function normalizeValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function getProviderKey(widgetId: string): string | undefined {
  const prefix = "root_";
  const suffix = "_roles";

  if (!widgetId.startsWith(prefix) || !widgetId.endsWith(suffix)) {
    return undefined;
  }

  return widgetId.slice(prefix.length, -suffix.length) || undefined;
}

export function GenAIRolesWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, registry } = props;
  const { t } = useTranslation(["views/settings"]);

  const formContext = registry?.formContext as ConfigFormContext | undefined;
  const selectedRoles = useMemo(() => normalizeValue(value), [value]);
  const providerKey = useMemo(() => getProviderKey(id), [id]);

  const { data: genaiInfo } = useSWR<GenAIModelsResponse>("genai/models", {
    revalidateOnFocus: false,
  });

  // The model currently chosen in the form, which is what the roles have to
  // reflect. Reading the saved config instead would keep reporting the previous
  // model's capabilities until a save and a refetch.
  const selectedModel = useMemo(() => {
    if (!providerKey) return undefined;
    const formData = formContext?.formData as
      Record<string, unknown> | undefined;
    const entry = formData?.[providerKey];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return undefined;
    }
    const model = (entry as Record<string, unknown>).model;
    return typeof model === "string" && model ? model : undefined;
  }, [formContext?.formData, providerKey]);

  // Capabilities the provider reported for that specific model. Absent when the
  // provider cannot describe a model it has not loaded, in which case the
  // entry-level flags (which describe the saved model) are the best available.
  const modelCapabilities: GenAIModelCapabilities | undefined = useMemo(() => {
    if (!providerKey || !selectedModel) return undefined;
    return genaiInfo?.[providerKey]?.model_capabilities?.[selectedModel];
  }, [genaiInfo, providerKey, selectedModel]);

  const capabilityOf = (
    key: "supports_embeddings" | "supports_transcription",
  ): boolean => {
    const perModel = modelCapabilities?.[key];
    if (perModel !== undefined) return perModel;
    if (!providerKey) return true;
    const info = genaiInfo?.[providerKey];
    // assume supported when nothing is known, so a role is never hidden on
    // missing information alone
    return info ? info[key] : true;
  };

  const embeddingsSupported = capabilityOf("supports_embeddings");
  const transcriptionSupported = capabilityOf("supports_transcription");

  const unsupportedRoles = useMemo(() => {
    const unsupported = new Set<string>();

    if (!embeddingsSupported) unsupported.add("embeddings");
    if (!transcriptionSupported) unsupported.add("transcribe");

    return unsupported;
  }, [embeddingsSupported, transcriptionSupported]);

  const availableRoles = useMemo(
    () => GENAI_ROLES.filter((role) => !unsupportedRoles.has(role)),
    [unsupportedRoles],
  );

  const occupiedRoles = useMemo(() => {
    const occupied = new Set<string>();
    const fd = formContext?.formData;

    if (!fd || typeof fd !== "object") return occupied;

    for (const [provider, config] of Object.entries(
      fd as Record<string, unknown>,
    )) {
      if (provider === providerKey) continue;
      if (!config || typeof config !== "object" || Array.isArray(config))
        continue;

      for (const role of normalizeValue(
        (config as Record<string, unknown>).roles,
      )) {
        occupied.add(role);
      }
    }

    return occupied;
  }, [formContext?.formData, providerKey]);

  // strip every unsupported role in a single onChange; two effects each
  // rewriting the same value would race and lose one of the edits
  useEffect(() => {
    if (!selectedRoles.some((role) => unsupportedRoles.has(role))) return;

    onChange(selectedRoles.filter((role) => !unsupportedRoles.has(role)));
  }, [unsupportedRoles, selectedRoles, onChange]);

  const toggleRole = (role: string, enabled: boolean) => {
    if (enabled) {
      if (!selectedRoles.includes(role)) {
        onChange([...selectedRoles, role]);
      }
      return;
    }

    onChange(selectedRoles.filter((item) => item !== role));
  };

  return (
    <div className="rounded-lg border border-secondary-highlight bg-background_alt p-2 pr-0 md:max-w-md">
      <div className="grid gap-2">
        {availableRoles.map((role) => {
          const checked = selectedRoles.includes(role);
          const roleDisabled = !checked && occupiedRoles.has(role);
          const label = t(`configForm.genaiRoles.options.${role}`, {
            ns: "views/settings",
            defaultValue: role,
          });

          return (
            <div
              key={role}
              className="flex items-center justify-between rounded-md px-3 py-0"
            >
              <label htmlFor={`${id}-${role}`} className="text-sm">
                {label}
              </label>
              <Switch
                id={`${id}-${role}`}
                checked={checked}
                disabled={disabled || readonly || roleDisabled}
                onCheckedChange={(enabled) => toggleRole(role, !!enabled)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
