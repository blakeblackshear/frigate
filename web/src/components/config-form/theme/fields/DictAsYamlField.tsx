import type { FieldPathList, FieldProps } from "@rjsf/utils";
import yaml from "js-yaml";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

function formatYaml(value: unknown): string {
  if (
    value == null ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value as Record<string, unknown>).length === 0)
  ) {
    return "";
  }
  try {
    return yaml.dump(value, { indent: 2, lineWidth: -1 }).trimEnd();
  } catch {
    return "";
  }
}

function parseYaml(text: string): {
  value: Record<string, unknown> | undefined;
  error: string | undefined;
} {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { value: {}, error: undefined };
  }
  try {
    const parsed = yaml.load(trimmed);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { value: undefined, error: "Must be a YAML mapping" };
    }
    return { value: parsed as Record<string, unknown>, error: undefined };
  } catch (e) {
    const msg = e instanceof yaml.YAMLException ? e.reason : "Invalid YAML";
    return { value: undefined, error: msg };
  }
}

export function DictAsYamlField(props: FieldProps) {
  const { formData, onChange, readonly, disabled, idSchema, schema } = props;

  const emptyPath = useMemo(() => [] as FieldPathList, []);
  const fieldPath =
    (props as { fieldPathId?: { path?: FieldPathList } }).fieldPathId?.path ??
    emptyPath;

  const [text, setText] = useState(() => formatYaml(formData));
  const [error, setError] = useState<string>();

  useEffect(() => {
    setText(formatYaml(formData));
    setError(undefined);
  }, [formData]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      setText(raw);
      const { value, error: parseError } = parseYaml(raw);
      setError(parseError);
      if (value !== undefined) {
        onChange(value, fieldPath);
      }
    },
    [onChange, fieldPath],
  );

  const handleBlur = useCallback(
    (_e: React.FocusEvent<HTMLTextAreaElement>) => {
      // Reformat on blur if valid
      const { value } = parseYaml(text);
      if (value !== undefined) {
        setText(formatYaml(value));
      }
    },
    [text],
  );

  const id = idSchema?.$id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {schema.title && (
        <label htmlFor={id} className="text-sm font-medium">
          {schema.title}
        </label>
      )}
      <Textarea
        id={id}
        className={cn("font-mono text-sm", error && "border-destructive")}
        value={text}
        disabled={disabled || readonly}
        placeholder={"key: value"}
        rows={Math.max(3, text.split("\n").length + 1)}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {schema.description && (
        <p className="text-xs text-muted-foreground">{schema.description}</p>
      )}
    </div>
  );
}
