import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { CameraNameLabel } from "../camera/CameraNameLabel";

type FilterSwitchProps = {
  label: string;
  disabled?: boolean;
  isChecked: boolean;
  isCameraName?: boolean;
  onCheckedChange: (checked: boolean) => void;
};
export default function FilterSwitch({
  label,
  disabled = false,
  isChecked,
  isCameraName = false,
  onCheckedChange,
}: FilterSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-1">
      {isCameraName ? (
        <CameraNameLabel
          className={`mx-2 w-full cursor-pointer text-sm font-medium leading-none text-primary smart-capitalize peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${disabled ? "text-secondary-foreground" : ""}`}
          htmlFor={label}
          camera={label}
        />
      ) : (
        <Label
          className={`mx-2 w-full cursor-pointer text-primary smart-capitalize ${disabled ? "text-secondary-foreground" : ""}`}
          htmlFor={label}
        >
          {label}
        </Label>
      )}
      <Switch
        id={label}
        disabled={disabled}
        checked={isChecked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
