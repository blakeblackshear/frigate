import { LuX } from "react-icons/lu";
import { Button } from "../ui/button";
import { FaCompactDisc } from "react-icons/fa";

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
        className={`flex justify-center px-2 gap-2 items-center pointer-events-auto rounded-lg ${
          show ? "animate-in slide-in-from-top duration-500" : "invisible"
        }  text-center mt-5 mx-auto`}
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
