/**
 * Number input field component for configuration forms
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

export interface NumberFieldProps {
  field: FormFieldMeta;
  path: string;
}

/**
 * NumberField component renders a number input with validation
 */
export function NumberField({ field, path }: NumberFieldProps) {
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

  const isInteger = field.type === "integer";

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
                {field.min !== undefined && field.max !== undefined && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Range: {field.min} - {field.max}
                  </p>
                )}
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
        type="number"
        step={field.step ?? (isInteger ? 1 : "any")}
        {...register(path, {
          required: field.required ? `${field.label} is required` : false,
          valueAsNumber: true,
          min: field.min !== undefined
            ? {
                value: field.min,
                message: `Minimum value is ${field.min}`,
              }
            : undefined,
          max: field.max !== undefined
            ? {
                value: field.max,
                message: `Maximum value is ${field.max}`,
              }
            : undefined,
          validate: isInteger
            ? (value) => {
                if (value !== undefined && !Number.isInteger(value)) {
                  return "Value must be an integer";
                }
                return true;
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