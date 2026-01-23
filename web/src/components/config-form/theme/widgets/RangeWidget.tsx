// Range Widget - maps to shadcn/ui Slider
import type { WidgetProps } from "@rjsf/utils";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function RangeWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange, schema, options } = props;

  const min = schema.minimum ?? 0;
  const max = schema.maximum ?? 100;
  const step =
    (options.step as number) || (schema.type === "integer" ? 1 : 0.1);

  return (
    <div className="flex items-center gap-4">
      <Slider
        id={id}
        value={[value ?? min]}
        min={min}
        max={max}
        step={step}
        disabled={disabled || readonly}
        onValueChange={(vals) => onChange(vals[0])}
        className={cn("flex-1", disabled && "opacity-50")}
      />
      <span className="w-12 text-right text-sm text-muted-foreground">
        {value ?? min}
      </span>
    </div>
  );
}
