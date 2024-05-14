type LiveIconProps = {
  layout?: "list" | "grid";
};

export function LiveGridIcon({ layout }: LiveIconProps) {
  return (
    <div className="flex size-full flex-col gap-0.5 overflow-hidden rounded-md">
      <div
        className={`h-1 w-full ${layout == "grid" ? "bg-selected" : "bg-muted-foreground"}`}
      />
      <div className="flex h-1 w-full gap-0.5">
        <div
          className={`w-full ${layout == "grid" ? "bg-selected" : "bg-muted-foreground"}`}
        />
        <div
          className={`w-full ${layout == "grid" ? "bg-selected" : "bg-muted-foreground"}`}
        />
      </div>
      <div className="flex h-1 w-full gap-0.5">
        <div
          className={`w-full ${layout == "grid" ? "bg-selected" : "bg-muted-foreground"}`}
        />
        <div
          className={`w-full ${layout == "grid" ? "bg-selected" : "bg-muted-foreground"}`}
        />
      </div>
    </div>
  );
}

export function LiveListIcon({ layout }: LiveIconProps) {
  return (
    <div className="flex size-full flex-col gap-0.5 overflow-hidden rounded-md">
      <div
        className={`size-full ${layout == "list" ? "bg-selected" : "bg-secondary-foreground"}`}
      />
      <div
        className={`size-full ${layout == "list" ? "bg-selected" : "bg-secondary-foreground"}`}
      />
    </div>
  );
}
