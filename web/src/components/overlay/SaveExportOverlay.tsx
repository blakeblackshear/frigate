import { LuX } from "react-icons/lu";
import { Button } from "../ui/button";
import { FaCompactDisc } from "react-icons/fa";
import { cn } from "@/lib/utils";

type SaveExportOverlayProps = {
  className: string;
  show: boolean;
  onSave: () => void;
  onCancel: () => void;
};
export default function SaveExportOverlay({
  className,
  show,
  onSave,
  onCancel,
}: SaveExportOverlayProps) {
  return (
    <div className={className}>
      <div
        className={cn(
          "pointer-events-auto flex items-center justify-center gap-2 rounded-lg px-2",
          show ? "duration-500 animate-in slide-in-from-top" : "invisible",
          "mx-auto mt-5 text-center",
        )}
      >
        <Button
          className="flex items-center gap-1"
          variant="select"
          size="sm"
          onClick={onSave}
        >
          <FaCompactDisc />
          Save Export
        </Button>
        <Button
          className="flex items-center gap-1 text-primary"
          size="sm"
          onClick={onCancel}
        >
          <LuX />
          Cancel
        </Button>
      </div>
    </div>
  );
}
