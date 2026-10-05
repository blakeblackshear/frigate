import type { WidgetProps } from "@rjsf/utils";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";

const INPUT_ROLES = ["detect", "record", "record_sub", "audio"] as const;

// Recording the sub stream from the same input as record would just
// re-record the main stream, so the two roles are mutually exclusive.
const CONFLICTING_ROLES: Partial<Record<string, string>> = {
  record: "record_sub",
  record_sub: "record",
};

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
  const { id, value, disabled, readonly, onChange, options } = props;
  const { t } = useTranslation(["views/settings"]);

  const selectedRoles = useMemo(() => normalizeValue(value), [value]);

  // Each role may only be assigned to a single input, so roles already
  // used by sibling inputs are locked.
  const rolesUsedByOtherInputs = useMemo(
    () => normalizeValue(options?.rolesUsedByOtherInputs),
    [options],
  );

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
          const usedByOtherInput =
            !checked && rolesUsedByOtherInputs.includes(role);
          const conflictingRole = CONFLICTING_ROLES[role];
          const hasConflict =
            !checked &&
            conflictingRole !== undefined &&
            selectedRoles.includes(conflictingRole);
          const hint = usedByOtherInput
            ? t("configForm.inputRoles.roleInUse", { ns: "views/settings" })
            : hasConflict
              ? t("configForm.inputRoles.recordSubConflict", {
                  ns: "views/settings",
                })
              : undefined;
          const label = t(`configForm.inputRoles.options.${role}`, {
            ns: "views/settings",
            defaultValue: role,
          });

          return (
            <div
              key={role}
              className="flex items-center justify-between rounded-md px-3 py-0"
            >
              <div className="flex flex-col">
                <label htmlFor={`${id}-${role}`} className="text-sm">
                  {label}
                </label>
                {hint ? (
                  <span className="text-xs text-muted-foreground">{hint}</span>
                ) : null}
              </div>
              <Switch
                id={`${id}-${role}`}
                checked={checked}
                disabled={
                  disabled || readonly || usedByOtherInput || hasConflict
                }
                onCheckedChange={(enabled) => toggleRole(role, !!enabled)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
