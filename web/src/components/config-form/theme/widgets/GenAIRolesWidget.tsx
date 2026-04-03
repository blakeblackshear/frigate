import type { WidgetProps } from "@rjsf/utils";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import type { ConfigFormContext } from "@/types/configForm";

const GENAI_ROLES = ["embeddings", "descriptions", "chat"] as const;

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

  // Compute occupied roles directly from formData. The computation is
  // trivially cheap (iterate providers × 3 roles max) so we skip an
  // intermediate memoization layer whose formData dependency would
  // never produce a cache hit (new object reference on every change).
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
        {GENAI_ROLES.map((role) => {
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
