// Color Widget - For RGB color objects
import type { WidgetProps } from "@rjsf/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useCallback } from "react";

interface RGBColor {
  red: number;
  green: number;
  blue: number;
}

export function ColorWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, onChange } = props;

  // Convert object to hex for color picker
  const hexValue = useMemo(() => {
    if (!value || typeof value !== "object") {
      return "#ffffff";
    }
    const { red = 255, green = 255, blue = 255 } = value as RGBColor;
    return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue.toString(16).padStart(2, "0")}`;
  }, [value]);

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      const red = parseInt(hex.slice(1, 3), 16);
      const green = parseInt(hex.slice(3, 5), 16);
      const blue = parseInt(hex.slice(5, 7), 16);
      onChange({ red, green, blue });
    },
    [onChange],
  );

  return (
    <div className="flex items-center gap-3">
      <Input
        id={id}
        type="color"
        value={hexValue}
        disabled={disabled || readonly}
        onChange={handleColorChange}
        className="h-10 w-14 cursor-pointer p-1"
      />
      <div className="flex gap-2 text-sm text-muted-foreground">
        <Label>R: {(value as RGBColor)?.red ?? 255}</Label>
        <Label>G: {(value as RGBColor)?.green ?? 255}</Label>
        <Label>B: {(value as RGBColor)?.blue ?? 255}</Label>
      </div>
    </div>
  );
}
