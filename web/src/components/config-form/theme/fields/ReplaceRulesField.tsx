import type { FieldPathList, FieldProps, RJSFSchema } from "@rjsf/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  LuChevronDown,
  LuChevronRight,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import type { ConfigFormContext } from "@/types/configForm";
import get from "lodash/get";
import { isSubtreeModified } from "../utils";

type ReplaceRule = {
  pattern?: string;
  replacement?: string;
};

function getItemSchema(schema: RJSFSchema): RJSFSchema | undefined {
  const items = schema.items;
  if (!items || typeof items !== "object" || Array.isArray(items)) {
    return undefined;
  }
  return items as RJSFSchema;
}

function getPropertyTitle(itemSchema: RJSFSchema | undefined, key: string) {
  const props = (itemSchema as { properties?: Record<string, RJSFSchema> })
    ?.properties;
  const title = props?.[key]?.title;
  return typeof title === "string" ? title : undefined;
}

export function ReplaceRulesField(props: FieldProps) {
  const { schema, formData, onChange, idSchema, disabled, readonly } = props;
  const formContext = props.registry?.formContext as
    | ConfigFormContext
    | undefined;

  const { t } = useTranslation(["common"]);

  const rules: ReplaceRule[] = useMemo(() => {
    if (!Array.isArray(formData)) {
      return [];
    }
    return formData as ReplaceRule[];
  }, [formData]);

  const itemSchema = useMemo(
    () => getItemSchema(schema as RJSFSchema),
    [schema],
  );
  const title = (schema as RJSFSchema).title;
  const description = (schema as RJSFSchema).description;
  const patternTitle = getPropertyTitle(itemSchema, "pattern");
  const replacementTitle = getPropertyTitle(itemSchema, "replacement");

  const hasItems = rules.length > 0;
  const emptyPath = useMemo(() => [] as FieldPathList, []);
  const fieldPath =
    (props as { fieldPathId?: { path?: FieldPathList } }).fieldPathId?.path ??
    emptyPath;

  const isModified = useMemo(() => {
    const baselineRoot = formContext?.baselineFormData;
    const baselineValue = baselineRoot
      ? get(baselineRoot, fieldPath)
      : undefined;
    return isSubtreeModified(
      rules,
      baselineValue,
      formContext?.overrides,
      fieldPath,
      formContext?.formData,
    );
  }, [fieldPath, formContext, rules]);

  const [open, setOpen] = useState(hasItems || isModified);

  useEffect(() => {
    if (isModified) {
      setOpen(true);
    }
  }, [isModified]);

  useEffect(() => {
    if (hasItems) {
      setOpen(true);
    }
  }, [hasItems]);

  const handleAdd = useCallback(() => {
    const next = [...rules, { pattern: "", replacement: "" }];
    onChange(next, fieldPath);
  }, [fieldPath, onChange, rules]);

  const handleRemove = useCallback(
    (index: number) => {
      const next = rules.filter((_, i) => i !== index);
      onChange(next, fieldPath);
    },
    [fieldPath, onChange, rules],
  );

  const handleUpdate = useCallback(
    (index: number, patch: Partial<ReplaceRule>) => {
      const next = rules.map((rule, i) => {
        if (i !== index) {
          return rule;
        }
        return {
          ...rule,
          ...patch,
        };
      });
      onChange(next, fieldPath);
    },
    [fieldPath, onChange, rules],
  );

  const baseId = idSchema?.$id || "replace_rules";
  const deleteLabel = t("button.delete", {
    ns: "common",
    defaultValue: "Delete",
  });

  return (
    <Card className="w-full">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer p-4 transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle
                  className={cn("text-sm", isModified && "text-danger")}
                >
                  {title}
                </CardTitle>
                {description && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              {open ? (
                <LuChevronDown className="h-4 w-4" />
              ) : (
                <LuChevronRight className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 p-4 pt-0">
            {rules.length > 0 && (
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-12 space-y-2 md:col-span-6">
                  {patternTitle && (
                    <Label className="text-xs text-muted-foreground">
                      {patternTitle}
                    </Label>
                  )}
                </div>
                <div className="col-span-12 space-y-2 md:col-span-5">
                  {replacementTitle && (
                    <Label className="text-xs text-muted-foreground">
                      {replacementTitle}
                    </Label>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {rules.map((rule, index) => {
                const patternId = `${baseId}-${index}-pattern`;
                const replacementId = `${baseId}-${index}-replacement`;

                return (
                  <div
                    key={index}
                    className="grid grid-cols-12 items-start gap-2"
                  >
                    <div className="col-span-12 md:col-span-6">
                      <Input
                        id={patternId}
                        value={rule?.pattern ?? ""}
                        disabled={disabled || readonly}
                        onChange={(e) =>
                          handleUpdate(index, { pattern: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-12 md:col-span-5">
                      <Input
                        id={replacementId}
                        value={rule?.replacement ?? ""}
                        disabled={disabled || readonly}
                        onChange={(e) =>
                          handleUpdate(index, { replacement: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-span-12 flex items-center md:col-span-1 md:justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(index)}
                        disabled={disabled || readonly}
                        aria-label={deleteLabel}
                        title={deleteLabel}
                      >
                        <LuTrash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAdd}
                disabled={disabled || readonly}
                className="gap-2"
              >
                <LuPlus className="h-4 w-4" />
                {t("button.add", { ns: "common", defaultValue: "Add" })}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default ReplaceRulesField;
