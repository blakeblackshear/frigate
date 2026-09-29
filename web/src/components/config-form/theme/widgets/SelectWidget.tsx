// Select Widget - maps to shadcn/ui Select
import type { WidgetProps } from "@rjsf/utils";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSizedFieldClassName } from "../utils";

export function SelectWidget(props: WidgetProps) {
  const {
    id,
    options,
    value,
    disabled,
    readonly,
    onChange,
    placeholder,
    schema,
  } = props;

  const { t, i18n } = useTranslation(["views/settings"]);
  const { enumOptions = [] } = options;
  const enumI18nPrefix = options["enumI18nPrefix"] as string | undefined;
  const enumI18nOptional = options["enumI18nOptional"] === true;
  const fieldClassName = getSizedFieldClassName(options, "sm");

  const getLabel = (option: { value: unknown; label: string }) => {
    if (enumI18nPrefix) {
      const key = `${enumI18nPrefix}.${option.value}`;

      // user-defined values (such as model scenes) are shown as named rather
      // than humanized by the missing key handler
      if (enumI18nOptional && !i18n.exists(key, { ns: "views/settings" })) {
        return String(option.value);
      }

      return t(key);
    }
    return option.label;
  };

  return (
    <Select
      value={value?.toString() ?? ""}
      onValueChange={(val) => {
        // Convert back to original type if needed
        const enumVal = enumOptions.find(
          (opt: { value: unknown }) => opt.value?.toString() === val,
        );
        onChange(enumVal ? enumVal.value : val);
      }}
      disabled={disabled || readonly}
    >
      <SelectTrigger id={id} className={fieldClassName}>
        <SelectValue placeholder={placeholder || schema.title || "Select..."} />
      </SelectTrigger>
      <SelectContent>
        {enumOptions.map((option: { value: unknown; label: string }) => (
          <SelectItem key={String(option.value)} value={String(option.value)}>
            {getLabel(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
