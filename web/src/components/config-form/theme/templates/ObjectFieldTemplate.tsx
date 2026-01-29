// Object Field Template - renders nested object fields with i18n support
import type { ObjectFieldTemplateProps } from "@rjsf/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Build the i18n translation key path for nested fields using the field path
 * provided by RJSF. This avoids ambiguity with underscores in field names.
 */
function buildTranslationPath(path: Array<string | number>): string {
  return path.filter((segment) => typeof segment === "string").join(".");
}

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { title, description, properties, uiSchema, registry, schema } = props;
  type FormContext = { i18nNamespace?: string };
  const formContext = registry?.formContext as FormContext | undefined;

  // Check if this is a root-level object
  const isRoot = registry?.rootSchema === schema;

  const [isOpen, setIsOpen] = useState(true);

  const { t } = useTranslation([
    formContext?.i18nNamespace || "common",
    "config/groups",
  ]);

  // Extract domain from i18nNamespace (e.g., "config/audio" -> "audio")
  const getDomainFromNamespace = (ns?: string): string => {
    if (!ns || !ns.startsWith("config/")) return "";
    return ns.replace("config/", "");
  };

  const domain = getDomainFromNamespace(formContext?.i18nNamespace);

  const groupDefinitions =
    (uiSchema?.["ui:groups"] as Record<string, string[]> | undefined) || {};

  const isHiddenProp = (prop: (typeof properties)[number]) =>
    prop.content.props.uiSchema?.["ui:widget"] === "hidden";

  const visibleProps = properties.filter((prop) => !isHiddenProp(prop));

  // Check for advanced section grouping
  const advancedProps = visibleProps.filter(
    (p) => p.content.props.uiSchema?.["ui:options"]?.advanced === true,
  );
  const regularProps = visibleProps.filter(
    (p) => p.content.props.uiSchema?.["ui:options"]?.advanced !== true,
  );

  const [showAdvanced, setShowAdvanced] = useState(false);

  const toTitle = (value: string) =>
    value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

  // Get the full translation path from the field path
  const fieldPathId = (
    props as { fieldPathId?: { path?: (string | number)[] } }
  ).fieldPathId;
  let propertyName: string | undefined;
  let translationPath: string | undefined;
  const path = fieldPathId?.path;
  if (path) {
    translationPath = buildTranslationPath(path);
    // Also get the last property name for fallback label generation
    for (let i = path.length - 1; i >= 0; i -= 1) {
      const segment = path[i];
      if (typeof segment === "string") {
        propertyName = segment;
        break;
      }
    }
  }

  // Try i18n translation, fall back to schema or original values
  const i18nNs = formContext?.i18nNamespace;

  let inferredLabel: string | undefined;
  if (i18nNs && translationPath) {
    const translated = t(`${translationPath}.label`, {
      ns: i18nNs,
      defaultValue: "",
    });
    inferredLabel = translated || undefined;
  }
  const schemaTitle = schema?.title;
  const fallbackLabel =
    title || schemaTitle || (propertyName ? toTitle(propertyName) : undefined);
  inferredLabel = inferredLabel ?? fallbackLabel;

  let inferredDescription: string | undefined;
  if (i18nNs && translationPath) {
    const translated = t(`${translationPath}.description`, {
      ns: i18nNs,
      defaultValue: "",
    });
    inferredDescription = translated || undefined;
  }
  const schemaDescription = schema?.description;
  const fallbackDescription =
    (typeof description === "string" ? description : undefined) ||
    schemaDescription;
  inferredDescription = inferredDescription ?? fallbackDescription;

  const renderGroupedFields = (items: (typeof properties)[number][]) => {
    if (!items.length) {
      return null;
    }

    const grouped = new Set<string>();
    const groups = Object.entries(groupDefinitions)
      .map(([groupKey, fields]) => {
        const ordered = fields
          .map((field) => items.find((item) => item.name === field))
          .filter(Boolean) as (typeof properties)[number][];

        if (ordered.length === 0) {
          return null;
        }

        ordered.forEach((item) => grouped.add(item.name));

        const label = domain
          ? t(`${domain}.${groupKey}`, {
              ns: "config/groups",
              defaultValue: toTitle(groupKey),
            })
          : t(`groups.${groupKey}`, {
              defaultValue: toTitle(groupKey),
            });

        return {
          key: groupKey,
          label,
          items: ordered,
        };
      })
      .filter(Boolean) as Array<{
      key: string;
      label: string;
      items: (typeof properties)[number][];
    }>;

    const ungrouped = items.filter((item) => !grouped.has(item.name));

    return (
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.key} className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              {group.label}
            </div>
            <div className="space-y-4">
              {group.items.map((element) => (
                <div key={element.name}>{element.content}</div>
              ))}
            </div>
          </div>
        ))}

        {ungrouped.length > 0 && (
          <div className={cn("space-y-4", groups.length > 0 && "pt-2")}>
            {ungrouped.map((element) => (
              <div key={element.name}>{element.content}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Root level renders children directly
  if (isRoot) {
    return (
      <div className="space-y-6">
        {renderGroupedFields(regularProps)}

        {advancedProps.length > 0 && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2">
                {showAdvanced ? (
                  <LuChevronDown className="h-4 w-4" />
                ) : (
                  <LuChevronRight className="h-4 w-4" />
                )}
                Advanced Settings ({advancedProps.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {renderGroupedFields(advancedProps)}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  }

  // Nested objects render as collapsible cards
  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">{inferredLabel}</CardTitle>
                {inferredDescription && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {inferredDescription}
                  </p>
                )}
              </div>
              {isOpen ? (
                <LuChevronDown className="h-4 w-4" />
              ) : (
                <LuChevronRight className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {renderGroupedFields(regularProps)}

            {advancedProps.length > 0 && (
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    {showAdvanced ? (
                      <LuChevronDown className="h-4 w-4" />
                    ) : (
                      <LuChevronRight className="h-4 w-4" />
                    )}
                    Advanced ({advancedProps.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {renderGroupedFields(advancedProps)}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
