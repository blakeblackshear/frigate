import { Button } from "../ui/button";
import { LuX } from "react-icons/lu";

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
        className={`flex justify-center px-2 gap-2 items-center pointer-events-auto bg-selected rounded-lg *:text-white *:hover:bg-transparent ${
          show ? "animate-in slide-in-from-top duration-500" : "invisible"
        }  text-center mt-5 mx-auto`}
      >
        <Button className="p-0" variant="ghost" size="sm" onClick={onSave}>
          Save Export
        </Button>
        <Button
          className="cursor-pointer"
          size="xs"
          variant="ghost"
          onClick={onCancel}
        >
          <LuX />
        </Button>
      </div>
    </div>
  );
}
