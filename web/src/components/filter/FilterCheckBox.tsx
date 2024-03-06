import { LuCheck } from "react-icons/lu";
import { Button } from "../ui/button";
import { IconType } from "react-icons";

type FilterCheckBoxProps = {
  label: string;
  CheckIcon?: IconType;
  isChecked: boolean;
  onCheckedChange: (isChecked: boolean) => void;
};

export default function FilterCheckBox({
  label,
  CheckIcon = LuCheck,
  isChecked,
  onCheckedChange,
}: FilterCheckBoxProps) {
  return (
    <Button
      className="capitalize flex justify-between items-center cursor-pointer w-full text-primary-foreground"
      variant="ghost"
      onClick={() => onCheckedChange(!isChecked)}
    >
      {isChecked ? (
        <CheckIcon className="w-6 h-6" />
      ) : (
        <div className="w-6 h-6" />
      )}
      <div className="ml-1 w-full flex justify-start">{label}</div>
    </Button>
  );
}
