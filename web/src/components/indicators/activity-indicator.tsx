import { cn } from "@/lib/utils";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

export default function ActivityIndicator({ className = "w-full", size = 30 }) {
  return (
    <div
      className={cn("flex items-center justify-center", className)}
      aria-label="Loading…"
    >
      <AiOutlineLoading3Quarters className="animate-spin" size={size} />
    </div>
  );
}
