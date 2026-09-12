import { useMemo } from "react";
import type { WidgetProps } from "@rjsf/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { getSizedFieldClassName } from "../utils";

const DEFAULT_TIMEZONE_VALUE = "__browser__";

function getTimezoneList(): string[] {
  if (typeof Intl !== "undefined") {
    const intl = Intl as typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };
    const supported = intl.supportedValuesOf?.("timeZone");
    if (supported && supported.length > 0) {
      return [...supported].sort();
    }
  }

  const fallback = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return fallback ? [fallback] : ["UTC"];
}

export function TimezoneSelectWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, schema, options } = props;
  const { t } = useTranslation(["views/settings", "common"]);

  const timezones = useMemo(() => getTimezoneList(), []);
  const selectedValue = value ? String(value) : DEFAULT_TIMEZONE_VALUE;
  const fieldClassName = getSizedFieldClassName(options, "sm");
  const defaultLabel = t("configForm.timezone.defaultOption", {
    ns: "views/settings",
  });

  return (
    <Select
      value={selectedValue}
      onValueChange={(next) =>
        onChange(next === DEFAULT_TIMEZONE_VALUE ? null : next)
      }
      disabled={disabled || readonly}
    >
      <SelectTrigger id={id} className={fieldClassName}>
        <SelectValue placeholder={schema.title || defaultLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={DEFAULT_TIMEZONE_VALUE}>{defaultLabel}</SelectItem>
        {timezones.map((timezone) => (
          <SelectItem key={timezone} value={timezone}>
            {timezone}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default TimezoneSelectWidget;
