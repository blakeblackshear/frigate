/**
 * String input field component for configuration forms
 */

import * as React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { FormFieldMeta } from "@/types/configSchema";

export interface StringFieldProps {
  field: FormFieldMeta;
  path: string;
}

/**
 * StringField component renders a text input with label, validation, and help text
 */
export function StringField({ field, path }: StringFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = React.useMemo(() => {
    const pathParts = path.split(".");
    let current = errors;
    for (const part of pathParts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current as { message?: string } | undefined;
  }, [errors, path]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={path} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-danger ml-1">*</span>}
        </Label>
        {field.description && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm">{field.description}</p>
                {field.examples && field.examples.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: {String(field.examples[0])}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Input
        id={path}
        {...register(path, {
          required: field.required ? `${field.label} is required` : false,
          minLength: field.validation?.minLength
            ? {
                value: field.validation.minLength as number,
                message: `Minimum length is ${field.validation.minLength}`,
              }
            : undefined,
          maxLength: field.validation?.maxLength
            ? {
                value: field.validation.maxLength as number,
                message: `Maximum length is ${field.validation.maxLength}`,
              }
            : undefined,
          pattern: field.validation?.pattern
            ? {
                value: new RegExp(field.validation.pattern as string),
                message: `Invalid format`,
              }
            : undefined,
        })}
        placeholder={field.placeholder}
        className={error ? "border-danger" : ""}
      />
      {error && (
        <p className="text-sm text-danger">{error.message}</p>
      )}
    </div>
  );
}