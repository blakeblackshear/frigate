// Generic Switches Widget - Reusable component for selecting from any list of entities
import type { WidgetProps } from "@rjsf/utils";
import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";

type FormContext = {
  cameraValue?: Record<string, unknown>;
  globalValue?: Record<string, unknown>;
  fullCameraConfig?: Record<string, unknown>;
  t?: (key: string, options?: Record<string, unknown>) => string;
};

export type { FormContext };

export type SwitchesWidgetOptions = {
  /** Function to extract available entities from context */
  getEntities: (context: FormContext) => string[];
  /** Function to get display label for an entity (e.g., translate, get friendly name) */
  getDisplayLabel?: (entity: string, context?: FormContext) => string;
  /** i18n key prefix (e.g., "objectLabels", "zoneNames") */
  i18nKey: string;
  /** Translation namespace (default: "views/settings") */
  namespace?: string;
};

function normalizeValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
}

/**
 * Generic switches widget for selecting from any list of entities (objects, zones, etc.)
 *
 * @example
 * // In uiSchema:
 * "track": {
 *   "ui:widget": "switches",
 *   "ui:options": {
 *     "getEntities": (context) => [...],
 *     "i18nKey": "objectLabels"
 *   }
 * }
 */
export function SwitchesWidget(props: WidgetProps) {
  const { value, disabled, readonly, onChange, formContext, id, registry } =
    props;

  // Get configuration from widget options
  const i18nKey = useMemo(
    () => (props.options?.i18nKey as string | undefined) || "entities",
    [props.options],
  );
  const namespace = useMemo(
    () => (props.options?.namespace as string | undefined) || "views/settings",
    [props.options],
  );

  // Try to get formContext from direct prop, options, or registry
  const context = useMemo(
    () =>
      (formContext as FormContext | undefined) ||
      (props.options?.formContext as FormContext | undefined) ||
      (registry?.formContext as FormContext | undefined),
    [formContext, props.options, registry],
  );

  const availableEntities = useMemo(() => {
    const getEntities =
      (props.options?.getEntities as
        | ((context: FormContext) => string[])
        | undefined) || (() => []);
    if (context) {
      return getEntities(context);
    }
    return [];
  }, [context, props.options]);

  const getDisplayLabel = useMemo(
    () =>
      (props.options?.getDisplayLabel as
        | ((entity: string, context?: FormContext) => string)
        | undefined) || ((entity: string) => entity),
    [props.options],
  );

  const selectedEntities = useMemo(() => normalizeValue(value), [value]);
  const [isOpen, setIsOpen] = useState(selectedEntities.length > 0);

  const toggleEntity = (entity: string, enabled: boolean) => {
    if (enabled) {
      onChange([...selectedEntities, entity]);
    } else {
      onChange(selectedEntities.filter((item) => item !== entity));
    }
  };

  const t = context?.t;
  const summary = t
    ? t(`configForm.${i18nKey}.summary`, {
        ns: namespace,
        defaultValue: "Selected {{count}}",
        count: selectedEntities.length,
      })
    : `Selected ${selectedEntities.length}`;

  const emptyMessage = t
    ? t(`configForm.${i18nKey}.empty`, {
        ns: namespace,
        defaultValue: "No items available",
      })
    : "No items available";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="space-y-3">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2"
            disabled={disabled || readonly}
          >
            {isOpen ? (
              <LuChevronDown className="h-4 w-4" />
            ) : (
              <LuChevronRight className="h-4 w-4" />
            )}
            {summary}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="bg-background_alt p-2">
          {availableEntities.length === 0 ? (
            <div className="text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            <div className="grid gap-2">
              {availableEntities.map((entity) => {
                const checked = selectedEntities.includes(entity);
                const displayLabel = getDisplayLabel(entity, context);
                return (
                  <div
                    key={entity}
                    className="flex items-center justify-between rounded-md px-3 py-0"
                  >
                    <label htmlFor={`${id}-${entity}`} className="text-sm">
                      {displayLabel}
                    </label>
                    <Switch
                      id={`${id}-${entity}`}
                      checked={checked}
                      disabled={disabled || readonly}
                      onCheckedChange={(value) => toggleEntity(entity, !!value)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
