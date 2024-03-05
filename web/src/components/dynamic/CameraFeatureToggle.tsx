import { IconType } from "react-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isDesktop } from "react-device-detect";

const variants = {
  primary: {
    active: "font-bold text-white bg-selected rounded-lg",
    inactive: "text-secondary-foreground bg-secondary rounded-lg",
  },
  overlay: {
    active: "font-bold text-white bg-selected rounded-full",
    inactive:
      "text-primary-white rounded-full bg-gradient-to-br from-gray-400 to-gray-500 bg-gray-500",
  },
};

type CameraFeatureToggleProps = {
  className?: string;
  variant?: "primary" | "overlay";
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
      className={`${className} flex flex-col justify-center items-center ${
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
