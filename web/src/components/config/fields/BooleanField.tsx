/**
 * Boolean switch field component for configuration forms
 */

import * as React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { FormFieldMeta } from "@/types/configSchema";

export interface BooleanFieldProps {
  field: FormFieldMeta;
  path: string;
}

/**
 * BooleanField component renders a switch/toggle for boolean values
 */
export function BooleanField({ field, path }: BooleanFieldProps) {
  const { control } = useFormContext();

  return (
    <div className="flex items-center justify-between space-x-2 py-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={path} className="text-sm font-medium cursor-pointer">
          {field.label}
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
        render={({ field: controllerField }) => (
          <Switch
            id={path}
            checked={controllerField.value as boolean}
            onCheckedChange={controllerField.onChange}
          />
        )}
      />
    </div>
  );
}