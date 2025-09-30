/**
 * Nested object field component for configuration forms
 * Renders a collapsible card for nested object structures
 */

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { FormFieldMeta } from "@/types/configSchema";
import { cn } from "@/lib/utils";

export interface NestedObjectFieldProps {
  field: FormFieldMeta;
  path: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * NestedObjectField component renders a collapsible section for nested objects
 */
export function NestedObjectField({
  field,
  path,
  children,
  defaultOpen = false,
}: NestedObjectFieldProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Card className="my-4">
      <CardHeader
        className="cursor-pointer hover:bg-accent/50 transition-colors py-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle className="text-base font-semibold">
              {field.label}
              {field.required && <span className="text-danger ml-1">*</span>}
            </CardTitle>
            {field.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p className="text-sm">{field.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          "transition-all overflow-hidden",
          isOpen ? "max-h-[5000px] py-4" : "max-h-0 py-0",
        )}
      >
        <div className="space-y-4">{children}</div>
      </CardContent>
    </Card>
  );
}