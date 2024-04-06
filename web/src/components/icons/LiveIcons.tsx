type LiveIconProps = {
  layout?: "list" | "grid";
};

export function LiveGridIcon({ layout }: LiveIconProps) {
  return (
    <div className="size-full flex flex-col gap-0.5 rounded-md overflow-hidden">
      <div
        className={`h-1 w-full ${layout == "grid" ? "bg-selected" : "bg-muted-foreground"}`}
      />
      <div className="h-1 w-full flex gap-0.5">
        <div
          className={`w-full ${layout == "grid" ? "bg-selected" : "bg-muted-foreground"}`}
        />
        <div
          className={`w-full ${layout == "grid" ? "bg-selected" : "bg-muted-foreground"}`}
        />
      </div>
      <div className="h-1 w-full flex gap-0.5">
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
    <div className="size-full flex flex-col gap-0.5 rounded-md overflow-hidden">
      <div
        className={`size-full ${layout == "list" ? "bg-selected" : "bg-secondary-foreground"}`}
      />
      <div
        className={`size-full ${layout == "list" ? "bg-selected" : "bg-secondary-foreground"}`}
      />
    </div>
  );
}
