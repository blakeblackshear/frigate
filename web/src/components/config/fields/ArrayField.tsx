/**
 * Array field component for configuration forms
 * Allows adding/removing items dynamically
 */

import * as React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Plus, X } from "lucide-react";
import { FormFieldMeta } from "@/types/configSchema";

export interface ArrayFieldProps {
  field: FormFieldMeta;
  path: string;
  itemType?: string;
}

/**
 * ArrayField component renders a dynamic list of items
 */
export function ArrayField({ field, path, itemType = "string" }: ArrayFieldProps) {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: path,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">
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
                    Example: {JSON.stringify(field.examples[0])}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-2 border rounded-md p-3 bg-background_alt">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No items added yet</p>
        )}
        {fields.map((item, index) => (
          <div key={item.id} className="flex items-center gap-2">
            <Input
              {...register(`${path}.${index}` as const, {
                valueAsNumber: itemType === "number" || itemType === "integer",
              })}
              type={
                itemType === "number" || itemType === "integer"
                  ? "number"
                  : "text"
              }
              placeholder={`Item ${index + 1}`}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              className="h-10 w-10 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const defaultValue =
              itemType === "number" || itemType === "integer" ? 0 : "";
            append(defaultValue);
          }}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>
    </div>
  );
}