/**
 * Enum select field component for configuration forms
 */

import * as React from "react";
import { useFormContext, Controller } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { FormFieldMeta } from "@/types/configSchema";

export interface EnumFieldProps {
  field: FormFieldMeta;
  path: string;
}

/**
 * EnumField component renders a select dropdown for enum values
 */
export function EnumField({ field, path }: EnumFieldProps) {
  const {
    control,
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

  const options = field.options || [];

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
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Controller
        name={path}
        control={control}
        rules={{
          required: field.required ? `${field.label} is required` : false,
        }}
        render={({ field: controllerField }) => (
          <Select
            value={String(controllerField.value ?? "")}
            onValueChange={controllerField.onChange}
          >
            <SelectTrigger
              id={path}
              className={error ? "border-danger" : ""}
            >
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={String(option.value)}
                  value={String(option.value)}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && (
        <p className="text-sm text-danger">{error.message}</p>
      )}
    </div>
  );
}