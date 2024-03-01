import { IconType } from "react-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop } from "react-device-detect";

const variants = {
  primary: {
    active: "font-bold text-primary-foreground bg-primary",
    inactive: "text-muted-foreground bg-muted",
  },
  secondary: {
    active: "font-bold text-primary",
    inactive: "text-muted-foreground",
  },
};

type CameraFeatureToggleProps = {
  className?: string;
  variant?: "primary" | "secondary";
  isActive: boolean;
  Icon: IconType;
  title: string;
  onClick?: () => void;
};

export default function CameraFeatureToggle({
  className = "",
  variant = "primary",
  isActive,
  Icon,
  title,
  onClick,
}: CameraFeatureToggleProps) {
  const content = (
    <div
      onClick={onClick}
      className={`${className} flex flex-col justify-center items-center rounded-lg ${
        variants[variant][isActive ? "active" : "inactive"]
      }`}
    >
      <Icon className="size-5 md:m-[6px]" />
    </div>
  );

  if (isDesktop) {
    return (
      <Tooltip>
        <TooltipTrigger>{content}</TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
