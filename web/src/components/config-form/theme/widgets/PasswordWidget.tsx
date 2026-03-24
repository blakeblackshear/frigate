// Password Widget - Input with password type
import type { WidgetProps } from "@rjsf/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { cn } from "@/lib/utils";
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

  const [showPassword, setShowPassword] = useState(false);
  const fieldClassName = getSizedFieldClassName(options, "sm");

  return (
    <div className={cn("relative", fieldClassName)}>
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value ?? ""}
        disabled={disabled || readonly}
        placeholder={placeholder || ""}
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
        disabled={disabled}
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
