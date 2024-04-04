import { IconType } from "react-icons";
import { NavLink } from "react-router-dom";
import { ENV } from "@/env";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop } from "react-device-detect";
import { TooltipPortal } from "@radix-ui/react-tooltip";

const variants = {
  primary: {
    active: "font-bold text-white bg-selected",
    inactive: "text-secondary-foreground bg-secondary",
  },
  secondary: {
    active: "font-bold text-selected",
    inactive: "text-secondary-foreground",
  },
};

type NavItemProps = {
  className: string;
  variant?: "primary" | "secondary";
  Icon: IconType;
  title: string;
  url: string;
  dev?: boolean;
  onClick?: () => void;
};

export default function NavItem({
  className,
  variant = "primary",
  Icon,
  title,
  url,
  dev,
  onClick,
}: NavItemProps) {
  const shouldRender = dev ? ENV !== "production" : true;

  if (!shouldRender) {
    return;
  }

  const content = (
    <NavLink
      to={url}
      onClick={onClick}
      className={({ isActive }) =>
        `${className} flex flex-col justify-center items-center rounded-lg ${
          variants[variant][isActive ? "active" : "inactive"]
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
            <p>{title}</p>
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    );
  }

  return content;
}
