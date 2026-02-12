import { cn } from "@/lib/utils";

const FIELD_SIZE_CLASS_MAP = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  full: "max-w-full",
} as const;

export type FieldSizeOption = keyof typeof FIELD_SIZE_CLASS_MAP;

type FieldSizingOptions = {
  size?: FieldSizeOption;
  maxWidthClassName?: string;
  className?: string;
};

export function getSizedFieldClassName(
  options: unknown,
  defaultSize: FieldSizeOption = "lg",
) {
  const sizingOptions =
    typeof options === "object" && options !== null
      ? (options as FieldSizingOptions)
      : undefined;

  const sizeClass =
    FIELD_SIZE_CLASS_MAP[sizingOptions?.size ?? defaultSize] ??
    FIELD_SIZE_CLASS_MAP[defaultSize];

  return cn(
    "w-full",
    sizingOptions?.maxWidthClassName ?? sizeClass,
    sizingOptions?.className,
  );
}
