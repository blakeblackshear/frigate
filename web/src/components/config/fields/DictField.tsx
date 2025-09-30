/**
 * Dictionary/Map field component for configuration forms
 * Allows adding/removing dynamic key-value pairs
 */

import * as React from "react";
import { useFormContext, useWatch } from "react-hook-form";
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

export interface DictFieldProps {
  field: FormFieldMeta;
  path: string;
  valueType?: string;
}

/**
 * DictField component renders a dynamic key-value map
 */
export function DictField({ field, path, valueType = "string" }: DictFieldProps) {
  const { register, setValue } = useFormContext();
  const value = useWatch({ name: path }) as Record<string, unknown> | undefined;
  const [newKey, setNewKey] = React.useState("");

  const entries = React.useMemo(() => {
    if (!value || typeof value !== "object") return [];
    return Object.entries(value);
  }, [value]);

  const handleAddEntry = () => {
    if (!newKey.trim()) return;
    const currentValue = (value || {}) as Record<string, unknown>;
    const defaultValue = valueType === "number" || valueType === "integer" ? 0 : "";
    setValue(path, { ...currentValue, [newKey]: defaultValue }, { shouldDirty: true });
    setNewKey("");
  };

  const handleRemoveEntry = (key: string) => {
    if (!value) return;
    const currentValue = { ...value } as Record<string, unknown>;
    delete currentValue[key];
    setValue(path, currentValue, { shouldDirty: true });
  };

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
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="space-y-2 border rounded-md p-3 bg-background_alt">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No entries added yet</p>
        )}
        {entries.map(([key, _]) => (
          <div key={key} className="flex items-center gap-2">
            <Input
              value={key}
              disabled
              className="w-1/3 bg-muted"
              placeholder="Key"
            />
            <Input
              {...register(`${path}.${key}` as const, {
                valueAsNumber: valueType === "number" || valueType === "integer",
              })}
              type={
                valueType === "number" || valueType === "integer"
                  ? "number"
                  : "text"
              }
              placeholder="Value"
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveEntry(key)}
              className="h-10 w-10 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-2">
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddEntry();
              }
            }}
            placeholder="New key name"
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddEntry}
            disabled={!newKey.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}