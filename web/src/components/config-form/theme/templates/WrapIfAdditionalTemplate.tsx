import {
  ADDITIONAL_PROPERTY_FLAG,
  FormContextType,
  getUiOptions,
  RJSFSchema,
  StrictRJSFSchema,
  WrapIfAdditionalTemplateProps,
} from "@rjsf/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { LuTrash2 } from "react-icons/lu";

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
    schema,
    uiSchema,
  } = props;

  const { t } = useTranslation(["views/settings"]);

  const additional = ADDITIONAL_PROPERTY_FLAG in schema;

  if (!additional) {
    return (
      <div className={classNames} style={style}>
        {children}
      </div>
    );
  }

  const keyId = `${id}-key`;
  const keyLabel = t("configForm.additionalProperties.keyLabel", {
    ns: "views/settings",
  });
  const valueLabel = t("configForm.additionalProperties.valueLabel", {
    ns: "views/settings",
  });
  const keyPlaceholder = t("configForm.additionalProperties.keyPlaceholder", {
    ns: "views/settings",
  });
  const removeLabel = t("configForm.additionalProperties.remove", {
    ns: "views/settings",
  });
  const uiOptions = getUiOptions(uiSchema);
  const keyIsReadonly = uiOptions.additionalPropertyKeyReadonly === true;

  return (
    <div
      className={cn("grid grid-cols-12 items-start gap-2", classNames)}
      style={style}
    >
      {!keyIsReadonly && (
        <div className="col-span-12 space-y-2 md:col-span-2">
          {displayLabel && <Label htmlFor={keyId}>{keyLabel}</Label>}
          {keyIsReadonly ? (
            <div
              id={keyId}
              className="flex items-center text-sm text-muted-foreground"
            >
              {label}
            </div>
          ) : (
            <Input
              id={keyId}
              name={keyId}
              required={required}
              defaultValue={label}
              placeholder={keyPlaceholder}
              disabled={disabled || readonly}
              onBlur={!readonly ? onKeyRenameBlur : undefined}
            />
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
