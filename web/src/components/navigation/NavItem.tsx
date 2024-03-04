import { IconType } from "react-icons";
import { NavLink } from "react-router-dom";
import { ENV } from "@/env";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCallback, useState } from "react";
import { isDesktop } from "react-device-detect";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { CameraGroupSelector } from "../filter/CameraGroupSelector";

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
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();
  const showTooltipTimer = useCallback(
    (showTooltip: boolean) => {
      if (!showTooltip) {
        setShowTooltip(showTooltip);

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } else {
        setTimeoutId(setTimeout(() => setShowTooltip(showTooltip), 500));
      }
    },
    [timeoutId],
  );

  return (
    shouldRender && (
      <Tooltip open={isDesktop && showTooltip}>
        <NavLink
          to={url}
          onClick={onClick}
          className={`${className} flex flex-col justify-center items-center rounded-lg`}
        >
          {({ isActive }) => (
            <>
              <TooltipTrigger
                className={`rounded-lg ${variants[variant][isActive ? "active" : "inactive"]}`}
              >
                <Icon
                  className="size-5 md:m-[6px]"
                  onMouseEnter={() =>
                    isDesktop ? showTooltipTimer(true) : null
                  }
                  onMouseLeave={() =>
                    isDesktop ? showTooltipTimer(false) : null
                  }
                />
              </TooltipTrigger>
              {isDesktop && title == "Live" && isActive && (
                <CameraGroupSelector className="mt-2" />
              )}
            </>
          )}
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
