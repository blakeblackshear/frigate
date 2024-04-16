import { NavLink } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop } from "react-device-detect";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { NavData } from "@/types/navigation";
import { IconType } from "react-icons";

const variants = {
  primary: {
    active: "font-bold text-white bg-selected hover:bg-selected/80",
    inactive: "text-secondary-foreground bg-secondary hover:bg-muted",
  },
  secondary: {
    active: "font-bold text-selected",
    inactive: "text-secondary-foreground",
  },
};

type NavItemProps = {
  className?: string;
  item: NavData;
  Icon: IconType;
  onClick?: () => void;
};

export default function NavItem({
  className,
  item,
  Icon,
  onClick,
}: NavItemProps) {
  if (item.enabled == false) {
    return;
  }

  const content = (
    <NavLink
      to={item.url}
      onClick={onClick}
      className={({ isActive }) =>
        `flex flex-col justify-center items-center rounded-lg ${className ?? ""} ${
          variants[item.variant ?? "primary"][isActive ? "active" : "inactive"]
        }`
      }
    >
      <Icon className="size-5 md:m-[6px]" />
    </NavLink>
  );

  if (isDesktop) {
    return (
      <Tooltip>
        <TooltipTrigger>{content}</TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="right">
            <p>{item.title}</p>
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    );
  }

  return content;
}
