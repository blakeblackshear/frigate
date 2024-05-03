import { LuPlus } from "react-icons/lu";
import Logo from "../Logo";

type FrigatePlusIconProps = {
  className?: string;
  onClick?: () => void;
};
export default function FrigatePlusIcon({
  className,
  onClick,
}: FrigatePlusIconProps) {
  return (
    <div
      className={`relative flex items-center ${className ?? ""}`}
      onClick={onClick}
    >
      <Logo className="size-full" />
      <LuPlus className="absolute size-2 translate-x-3 translate-y-3/4" />
    </div>
  );
}
