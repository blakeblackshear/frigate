// Array Field Template - renders array fields with add/remove controls
import type { ArrayFieldTemplateProps } from "@rjsf/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LuPlus, LuTrash2, LuGripVertical } from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ArrayItem {
  key: string;
  index: number;
  children: React.ReactNode;
  hasRemove: boolean;
  onDropIndexClick: (index: number) => () => void;
}

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

      {(items as unknown as ArrayItem[]).map((element: ArrayItem) => (
        <div
          key={element.key}
          className={cn("flex items-start gap-2", !isSimpleType && "flex-col")}
        >
          {isSimpleType ? (
            <div className="flex flex-1 items-center gap-2">
              <LuGripVertical className="h-4 w-4 cursor-move text-muted-foreground" />
              <div className="flex-1">{element.children}</div>
              {element.hasRemove && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={element.onDropIndexClick(element.index)}
                  disabled={disabled || readonly}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <LuTrash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <Card className="w-full">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <LuGripVertical className="mt-2 h-4 w-4 cursor-move text-muted-foreground" />
                  <div className="flex-1">{element.children}</div>
                  {element.hasRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={element.onDropIndexClick(element.index)}
                      disabled={disabled || readonly}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ))}

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
          {t("add", { ns: "common", defaultValue: "Add" })}
        </Button>
      )}
    </div>
  );
}
