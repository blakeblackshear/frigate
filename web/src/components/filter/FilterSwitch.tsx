import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

type FilterSwitchProps = {
  label: string;
  isChecked: boolean;
  onCheckedChange: (checked: boolean) => void;
};
export default function FilterSwitch({
  label,
  isChecked,
  onCheckedChange,
}: FilterSwitchProps) {
  return (
    <div className="flex justify-between items-center gap-1">
      <Label
        className="w-full mx-2 text-primary capitalize cursor-pointer"
        htmlFor={label}
      >
        {label}
      </Label>
      <Switch
        id={label}
        checked={isChecked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
}
