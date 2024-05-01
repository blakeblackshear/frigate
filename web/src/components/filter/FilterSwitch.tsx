import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

type FilterSwitchProps = {
  label: string;
  disabled?: boolean;
  isChecked: boolean;
  onCheckedChange: (checked: boolean) => void;
};
export default function FilterSwitch({
  label,
  disabled = false,
  isChecked,
  onCheckedChange,
}: FilterSwitchProps) {
  return (
    <div className="flex justify-between items-center gap-1">
      <Label
        className={`w-full mx-2 text-primary capitalize cursor-pointer ${disabled ? "text-secondary-foreground" : ""}`}
        htmlFor={label}
      >
        {label}
      </Label>
      <Switch
        id={label}
        disabled={disabled}
        checked={isChecked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
