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
    <div className="flex items-center justify-between gap-1">
      <Label
        className={`mx-2 w-full cursor-pointer capitalize text-primary ${disabled ? "text-secondary-foreground" : ""}`}
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
