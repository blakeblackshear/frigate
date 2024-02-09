import { LuLoader2 } from "react-icons/lu";

export default function ActivityIndicator({ size = 30 }) {
  return (
    <div
      className="w-full flex items-center justify-center"
      aria-label="Loading…"
    >
      <LuLoader2 className="animate-spin" size={size} />
    </div>
  );
}
