// Password Widget - Input with password type
import type { WidgetProps } from "@rjsf/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { REDACTED_CREDENTIAL_SENTINEL } from "@/lib/const";
import { getSizedFieldClassName } from "../utils";

export function PasswordWidget(props: WidgetProps) {
  const {
    id,
    value,
    disabled,
    readonly,
    onChange,
    onBlur,
    onFocus,
    placeholder,
    schema,
    options,
  } = props;

  const { t } = useTranslation(["common"]);
  const [showPassword, setShowPassword] = useState(false);
  const fieldClassName = getSizedFieldClassName(options, "sm");

  // When the backend returns the sentinel, hide it visually and prompt the
  // user that a value is already saved. The value stays as the sentinel in
  // form state — backend /config/set strips it so the saved YAML is
  // preserved when the user doesn't touch the field.
  const isRedacted = value === REDACTED_CREDENTIAL_SENTINEL;
  const displayValue = isRedacted ? "" : (value ?? "");
  const effectivePlaceholder = isRedacted
    ? t("credentialField.savedPlaceholder", {
        ns: "common",
        defaultValue: "Saved — leave blank to keep current",
      })
    : placeholder || "";

  return (
    <div className={cn("relative", fieldClassName)}>
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        value={displayValue}
        disabled={disabled || readonly}
        placeholder={effectivePlaceholder}
        onChange={(e) =>
          onChange(e.target.value === "" ? undefined : e.target.value)
        }
        onBlur={(e) => onBlur(id, e.target.value)}
        onFocus={(e) => onFocus(id, e.target.value)}
        aria-label={schema.title}
        className="w-full pr-10"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
        onClick={() => setShowPassword(!showPassword)}
        disabled={disabled || isRedacted}
      >
        {showPassword ? (
          <LuEyeOff className="h-4 w-4" />
        ) : (
          <LuEye className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
