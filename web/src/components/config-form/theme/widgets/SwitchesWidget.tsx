// Generic Switches Widget - Reusable component for selecting from any list of entities
import { WidgetProps } from "@rjsf/utils";
import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import { ConfigFormContext } from "@/types/configForm";
import { cn } from "@/lib/utils";

type FormContext = Pick<
  ConfigFormContext,
  | "cameraValue"
  | "globalValue"
  | "fullCameraConfig"
  | "fullConfig"
  | "t"
  | "level"
> & {
  fullCameraConfig?: CameraConfig;
  fullConfig?: FrigateConfig;
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
  /** Optional class name for the list container */
  listClassName?: string;
  /** Enable search input to filter the list */
  enableSearch?: boolean;
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

  const listClassName = useMemo(
    () => props.options?.listClassName as string | undefined,
    [props.options],
  );

  const enableSearch = useMemo(
    () => props.options?.enableSearch as boolean | undefined,
    [props.options],
  );

  const selectedEntities = useMemo(() => normalizeValue(value), [value]);
  const [isOpen, setIsOpen] = useState(selectedEntities.length > 0);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEntities = useMemo(() => {
    if (!enableSearch || !searchTerm.trim()) {
      return availableEntities;
    }
    const term = searchTerm.toLowerCase();
    return availableEntities.filter((entity) => {
      const displayLabel = getDisplayLabel(entity, context);
      return displayLabel.toLowerCase().includes(term);
    });
  }, [availableEntities, searchTerm, enableSearch, getDisplayLabel, context]);

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
        defaultValue: "{{count}} selected",
        count: selectedEntities.length,
      })
    : `${selectedEntities.length} selected`;

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
            className="w-full justify-start gap-2 pl-0"
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

        <CollapsibleContent className="rounded-lg bg-secondary p-2 pr-0 md:max-w-md">
          {availableEntities.length === 0 ? (
            <div className="text-sm text-muted-foreground">{emptyMessage}</div>
          ) : (
            <>
              {enableSearch && (
                <div className="mr-2">
                  <Input
                    type="text"
                    placeholder={t?.("configForm.searchPlaceholder", {
                      ns: "views/settings",
                      defaultValue: "Search...",
                    })}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                </div>
              )}
              <div className={cn("grid gap-2", listClassName)}>
                {filteredEntities.map((entity) => {
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
                        onCheckedChange={(value) =>
                          toggleEntity(entity, !!value)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
