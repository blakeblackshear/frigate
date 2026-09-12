/**
 * Shared UI components for config form templates and fields.
 */

import { canExpand } from "@rjsf/utils";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LuPlus, LuChevronDown, LuChevronRight } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useEffect, useState, type ReactNode } from "react";

interface AddPropertyButtonProps {
  /** Callback fired when the add button is clicked */
  onAddProperty?: () => void;
  /** JSON Schema to determine expandability */
  schema: RJSFSchema;
  /** UI Schema for expansion checks */
  uiSchema?: UiSchema;
  /** Current form data for expansion checks */
  formData?: unknown;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Whether the form is read-only */
  readonly?: boolean;
}

/**
 * Add property button for RJSF objects with additionalProperties.
 * Shows "Add" button that allows adding new key-value pairs to objects.
 */
export function AddPropertyButton({
  onAddProperty,
  schema,
  uiSchema,
  formData,
  disabled,
  readonly,
}: AddPropertyButtonProps) {
  const { t } = useTranslation(["common"]);

  const canAdd =
    Boolean(onAddProperty) && canExpand(schema, uiSchema, formData);

  if (!canAdd) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onAddProperty}
      disabled={disabled || readonly}
      className="gap-2"
    >
      <LuPlus className="h-4 w-4" />
      {typeof uiSchema?.["ui:options"]?.addButtonText === "string"
        ? uiSchema["ui:options"].addButtonText
        : t("button.add", { ns: "common", defaultValue: "Add" })}
    </Button>
  );
}

interface MapKeyInputProps {
  /** DOM id used for label association */
  id: string;
  /** The committed key as it exists in the form data */
  value: string;
  /** Placeholder shown when the input is empty */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Called with the edited key when it is safe to commit */
  onCommit: (next: string) => void;
  /** Whether another entry already uses this key, which defers the commit */
  isKeyTaken?: (next: string) => boolean;
}

/**
 * Text input for the key of a map entry (e.g. a live stream name).
 *
 * The edit is kept in local state so that the draft can be re-synced whenever
 * the committed key changes underneath the input, which is what happens when
 * the selected camera changes while the field stays mounted.
 *
 * Each keystroke is committed so the section is marked as modified right away,
 * except while the typed key belongs to another entry: renaming onto an
 * existing key merges the two entries, so a name typed through a neighbor's
 * name would silently drop it. Those keystrokes stay local until the key is
 * free again or the input is blurred.
 */
export function MapKeyInput({
  id,
  value,
  placeholder,
  disabled,
  className,
  onCommit,
  isKeyTaken,
}: MapKeyInputProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleChange = (next: string) => {
    setDraft(next);

    if (!isKeyTaken?.(next)) {
      onCommit(next);
    }
  };

  return (
    <Input
      id={id}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={() => onCommit(draft)}
    />
  );
}

interface AdvancedCollapsibleProps {
  /** Number of advanced fields */
  count: number;
  /** Whether the collapsible is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Content to show when expanded */
  children: ReactNode;
  /** Use root-level label variant (longer text) */
  isRoot?: boolean;
  /** Button size - defaults to undefined (default) for root, "sm" for nested */
  buttonSize?: "sm" | "default" | "lg" | "icon";
}

/**
 * Collapsible section for advanced form fields.
 * Provides consistent styling and i18n labels for advanced settings.
 */
export function AdvancedCollapsible({
  count,
  open,
  onOpenChange,
  children,
  isRoot = false,
  buttonSize,
}: AdvancedCollapsibleProps) {
  const { t } = useTranslation(["views/settings", "common"]);

  if (count === 0) {
    return null;
  }

  const effectiveSize = buttonSize ?? (isRoot ? undefined : "sm");

  const label = isRoot
    ? t("configForm.advancedSettingsCount", {
        ns: "views/settings",
        defaultValue: "Advanced Settings ({{count}})",
        count,
      })
    : t("configForm.advancedCount", {
        ns: "views/settings",
        defaultValue: "Advanced ({{count}})",
        count,
      });

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size={effectiveSize}
          className="w-full justify-start gap-2 pl-0 hover:bg-transparent"
        >
          {open ? (
            <LuChevronDown className="h-4 w-4" />
          ) : (
            <LuChevronRight className="h-4 w-4" />
          )}
          {label}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-4 rounded-lg border border-border/60 bg-secondary/40 p-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
