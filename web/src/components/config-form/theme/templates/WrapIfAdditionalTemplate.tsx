import {
  ADDITIONAL_PROPERTY_FLAG,
  FormContextType,
  getUiOptions,
  RJSFSchema,
  StrictRJSFSchema,
  WrapIfAdditionalTemplateProps,
} from "@rjsf/utils";
import { useEffect, useMemo, useState, type FocusEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { LuTrash2 } from "react-icons/lu";
import type { ConfigFormContext } from "@/types/configForm";

export function WrapIfAdditionalTemplate<
  T = unknown,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = FormContextType,
>(props: WrapIfAdditionalTemplateProps<T, S, F>) {
  const {
    classNames,
    style,
    children,
    disabled,
    id,
    label,
    displayLabel,
    onRemoveProperty,
    onKeyRenameBlur,
    readonly,
    required,
    registry,
    schema,
    uiSchema,
  } = props;

  const { t } = useTranslation(["views/settings"]);

  const additional = ADDITIONAL_PROPERTY_FLAG in schema;

  const uiOptions = getUiOptions(uiSchema);
  const keyIsReadonly = uiOptions.additionalPropertyKeyReadonly === true;

  const keyLabelKey =
    typeof uiOptions.additionalPropertyKeyLabel === "string"
      ? uiOptions.additionalPropertyKeyLabel
      : undefined;
  const keyPlaceholderKey =
    typeof uiOptions.additionalPropertyKeyPlaceholder === "string"
      ? uiOptions.additionalPropertyKeyPlaceholder
      : undefined;
  const keyPattern =
    typeof uiOptions.additionalPropertyKeyPattern === "string"
      ? uiOptions.additionalPropertyKeyPattern
      : undefined;
  const preventKeyRename = uiOptions.preventKeyRename === true;

  const formContext = registry?.formContext as ConfigFormContext | undefined;

  // optionally, lock the key once it's been saved
  const baseline = formContext?.baselineFormData;
  const keyLocked =
    preventKeyRename &&
    typeof label === "string" &&
    !!baseline &&
    Object.prototype.hasOwnProperty.call(baseline, label);

  // controlled key value so we can validate live and block invalid renames.
  const [keyValue, setKeyValue] = useState<string>(label ?? "");
  useEffect(() => {
    setKeyValue(label ?? "");
  }, [label]);

  const keyRegex = useMemo(
    () => (keyPattern ? new RegExp(keyPattern) : undefined),
    [keyPattern],
  );
  const keyError = useMemo(() => {
    if (!keyRegex || keyLocked) return null;
    if (!keyRegex.test(keyValue)) {
      return t("configForm.additionalProperties.keyPatternError", {
        ns: "views/settings",
        defaultValue:
          "Use only letters, numbers, hyphens, and underscores (no spaces)",
      });
    }
    return null;
  }, [keyRegex, keyLocked, keyValue, t]);

  if (!additional) {
    return (
      <div className={classNames} style={style}>
        {children}
      </div>
    );
  }

  const keyId = `${id}-key`;
  const keyLabel = keyLabelKey
    ? t(keyLabelKey, { ns: "views/settings" })
    : t("configForm.additionalProperties.keyLabel", { ns: "views/settings" });
  const valueLabel = t("configForm.additionalProperties.valueLabel", {
    ns: "views/settings",
  });
  const keyPlaceholder = keyPlaceholderKey
    ? t(keyPlaceholderKey, { ns: "views/settings" })
    : t("configForm.additionalProperties.keyPlaceholder", {
        ns: "views/settings",
      });
  const removeLabel = t("configForm.additionalProperties.remove", {
    ns: "views/settings",
  });

  const commitKeyRename = (e: FocusEvent<HTMLInputElement>) => {
    if (readonly) return;
    if (keyError) return;
    onKeyRenameBlur?.(e);
  };

  return (
    <div
      className={cn("grid grid-cols-12 items-start gap-2", classNames)}
      style={style}
    >
      {!keyIsReadonly && (
        <div className="col-span-12 space-y-2 md:col-span-2">
          {displayLabel && <Label htmlFor={keyId}>{keyLabel}</Label>}
          {keyLocked ? (
            <div
              id={keyId}
              className="flex items-center break-all text-sm text-primary-variant"
            >
              {label}
            </div>
          ) : (
            <>
              <Input
                id={keyId}
                name={keyId}
                required={required}
                value={keyValue}
                placeholder={keyPlaceholder}
                disabled={disabled || readonly}
                onChange={(e) => setKeyValue(e.target.value)}
                onBlur={!readonly ? commitKeyRename : undefined}
                aria-invalid={keyError ? true : undefined}
              />
              {keyError && (
                <p className="text-xs text-destructive">{keyError}</p>
              )}
            </>
          )}
        </div>
      )}
      <div
        className={cn(
          "col-span-12 space-y-2",
          !keyIsReadonly && "md:col-span-9",
        )}
      >
        {!keyIsReadonly && displayLabel && (
          <Label htmlFor={id}>{valueLabel}</Label>
        )}
        <div className="min-w-0">{children}</div>
      </div>
      {!keyIsReadonly && (
        <div className="col-span-12 flex items-center md:col-span-1 md:justify-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemoveProperty}
            disabled={disabled || readonly}
            aria-label={removeLabel}
            title={removeLabel}
          >
            <LuTrash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default WrapIfAdditionalTemplate;
