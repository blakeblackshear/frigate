// Field Template - wraps each form field with label and description
import type { FieldTemplateProps } from "@rjsf/utils";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    label,
    children,
    errors,
    help,
    description,
    hidden,
    required,
    displayLabel,
    schema,
    uiSchema,
  } = props;

  if (hidden) {
    return <div className="hidden">{children}</div>;
  }

  // Get UI options
  const uiOptions = uiSchema?.["ui:options"] || {};
  const isAdvanced = uiOptions.advanced === true;

  // Boolean fields (switches) render label inline
  const isBoolean = schema.type === "boolean";

  return (
    <div
      className={cn(
        "space-y-2",
        isAdvanced && "border-l-2 border-muted pl-4",
        isBoolean && "flex items-center justify-between gap-4",
      )}
    >
      {displayLabel && label && !isBoolean && (
        <Label
          htmlFor={id}
          className={cn(
            "text-sm font-medium",
            errors && errors.props?.errors?.length > 0 && "text-destructive",
          )}
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}

      {isBoolean ? (
        <div className="flex w-full items-center justify-between gap-4">
          <div className="space-y-0.5">
            {displayLabel && label && (
              <Label htmlFor={id} className="text-sm font-medium">
                {label}
                {required && <span className="ml-1 text-destructive">*</span>}
              </Label>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {children}
        </div>
      ) : (
        <>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {children}
        </>
      )}

      {errors}
      {help}
    </div>
  );
}
