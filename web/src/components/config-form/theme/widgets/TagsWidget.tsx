// Tags Widget - For array of strings input
import type { WidgetProps } from "@rjsf/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useCallback, useMemo } from "react";
import { LuX } from "react-icons/lu";

export function TagsWidget(props: WidgetProps) {
  const { id, value = [], disabled, readonly, onChange, schema } = props;

  const [inputValue, setInputValue] = useState("");

  const tags = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  const addTag = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
      setInputValue("");
    }
  }, [inputValue, tags, onChange]);

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((tag: string) => tag !== tagToRemove));
    },
    [tags, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag: string, index: number) => (
          <Badge key={`${tag}-${index}`} variant="secondary" className="gap-1">
            {tag}
            {!disabled && !readonly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeTag(tag)}
              >
                <LuX className="h-3 w-3" />
              </Button>
            )}
          </Badge>
        ))}
      </div>
      {!readonly && (
        <Input
          id={id}
          type="text"
          value={inputValue}
          disabled={disabled}
          placeholder={`Add ${schema.title?.toLowerCase() || "item"}...`}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
        />
      )}
    </div>
  );
}
