import { cn } from "@/lib/utils";
import { LuLoader2 } from "react-icons/lu";

export default function ActivityIndicator({ className = "w-full", size = 30 }) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      aria-label="Loading…"
    >
      <LuLoader2 className="animate-spin" size={size} />
    </div>
  );
}
