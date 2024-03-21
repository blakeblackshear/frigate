import { LuCheck } from "react-icons/lu";
import { Button } from "../ui/button";
import { IconType } from "react-icons";

type FilterCheckBoxProps = {
  label: string;
  CheckIcon?: IconType;
  iconClassName?: string;
  isChecked: boolean;
  onCheckedChange: (isChecked: boolean) => void;
};

export default function FilterCheckBox({
  label,
  CheckIcon = LuCheck,
  iconClassName = "size-6",
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
        <CheckIcon className={iconClassName} />
      ) : (
        <div className={iconClassName} />
      )}
      <div className="ml-1 w-full flex justify-start">{label}</div>
    </Button>
  );
}
