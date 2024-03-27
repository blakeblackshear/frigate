import { Button } from "../ui/button";

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
        className={`flex justify-center px-2 gap-2 items-center pointer-events-auto rounded-lg *:text-white ${
          show ? "animate-in slide-in-from-top duration-500" : "invisible"
        }  text-center mt-5 mx-auto`}
      >
        <Button variant="select" size="sm" onClick={onSave}>
          Save Export
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
