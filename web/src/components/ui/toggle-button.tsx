import { cn } from "@/lib/utils";

export default function ToggleButton({
  active,
  onClick,
  children,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled: boolean;
}) {
  return (
    <button
      className={cn(
        "rounded-md px-3 py-1 text-sm font-medium transition-colors",
        active && !disabled
          ? "bg-selected text-white"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        disabled && "cursor-not-allowed opacity-50",
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
