import { useMemo } from "react";
import type { WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConfigFormContext } from "@/types/configForm";
import { getSizedFieldClassName } from "../utils";

const BUILT_IN_ROLES = ["admin", "viewer"];

export function DefaultRoleWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, schema, options, registry } =
    props;
  const { t } = useTranslation(["views/settings"]);

  const fieldClassName = getSizedFieldClassName(options, "sm");

  const formContext = registry?.formContext as ConfigFormContext | undefined;
  const roles = useMemo<string[]>(() => {
    const configured = Object.keys(formContext?.fullConfig?.auth?.roles ?? {});
    // Keep admin/viewer first, then any custom roles in config order.
    const custom = configured.filter((r) => !BUILT_IN_ROLES.includes(r));
    return [...BUILT_IN_ROLES, ...custom];
  }, [formContext]);

  const selectedValue = typeof value === "string" && value ? value : "viewer";

  const getLabel = (role: string) =>
    BUILT_IN_ROLES.includes(role) ? t(`configForm.defaultRole.${role}`) : role;

  return (
    <Select
      value={selectedValue}
      onValueChange={onChange}
      disabled={disabled || readonly}
    >
      <SelectTrigger id={id} className={fieldClassName}>
        <SelectValue placeholder={schema.title} />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role}>
            {getLabel(role)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default DefaultRoleWidget;
