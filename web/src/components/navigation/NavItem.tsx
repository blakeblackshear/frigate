import { IconType } from "react-icons";
import { NavLink } from "react-router-dom";
import { ENV } from "@/env";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { isDesktop } from "react-device-detect";
import { TooltipPortal } from "@radix-ui/react-tooltip";

const variants = {
  primary: {
    active: "font-bold text-white bg-selected",
    inactive: "text-muted-foreground bg-secondary",
  },
  secondary: {
    active: "font-bold text-selected",
    inactive: "text-muted-foreground",
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

  const [showTooltip, setShowTooltip] = useState(false);

  return (
    shouldRender && (
      <Tooltip open={isDesktop && showTooltip}>
        <NavLink
          to={url}
          onClick={onClick}
          className={({ isActive }) =>
            `${className} flex flex-col justify-center items-center rounded-lg ${
              variants[variant][isActive ? "active" : "inactive"]
            }`
          }
          onMouseEnter={() => (isDesktop ? setShowTooltip(true) : null)}
          onMouseLeave={() => (isDesktop ? setShowTooltip(false) : null)}
        >
          <TooltipTrigger>
            <Icon className="size-5 md:m-[6px]" />
          </TooltipTrigger>
        </NavLink>
        <TooltipPortal>
          <TooltipContent side="right">
            <p>{title}</p>
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    )
  );
}
