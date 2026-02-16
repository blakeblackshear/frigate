import type { WidgetProps } from "@rjsf/utils";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";

const INPUT_ROLES = ["detect", "record", "audio"] as const;

function normalizeValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

export function InputRolesWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange } = props;
  const { t } = useTranslation(["views/settings"]);

  const selectedRoles = useMemo(() => normalizeValue(value), [value]);

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
        {INPUT_ROLES.map((role) => {
          const checked = selectedRoles.includes(role);
          const label = t(`configForm.inputRoles.options.${role}`, {
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
                disabled={disabled || readonly}
                onCheckedChange={(enabled) => toggleRole(role, !!enabled)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
