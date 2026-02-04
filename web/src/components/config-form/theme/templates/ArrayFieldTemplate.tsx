// Array Field Template - renders array fields with add/remove controls
import type { ArrayFieldTemplateProps } from "@rjsf/utils";
import { Button } from "@/components/ui/button";
import { LuPlus } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const { items, canAdd, onAddClick, disabled, readonly, schema } = props;

  const { t } = useTranslation(["common"]);

  // Simple items (strings, numbers) render inline
  const isSimpleType =
    schema.items &&
    typeof schema.items === "object" &&
    "type" in schema.items &&
    ["string", "number", "integer", "boolean"].includes(
      schema.items.type as string,
    );

  return (
    <div className="space-y-3">
      {items.length === 0 && !canAdd && (
        <p className="text-sm italic text-muted-foreground">
          {t("no_items", { ns: "common", defaultValue: "No items" })}
        </p>
      )}

      {items.map((element, index) => {
        // RJSF items are pre-rendered React elements, render them directly
        return (
          <div
            key={element.key || index}
            className={cn(
              "flex w-full items-start gap-2",
              !isSimpleType && "flex-col",
            )}
          >
            {element}
          </div>
        );
      })}

      {canAdd && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddClick}
          disabled={disabled || readonly}
          className="gap-2"
        >
          <LuPlus className="h-4 w-4" />
          {t("button.add", { ns: "common", defaultValue: "Add" })}
        </Button>
      )}
    </div>
  );
}
