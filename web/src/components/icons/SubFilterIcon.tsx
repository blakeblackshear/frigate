import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { FaCog, FaFilter } from "react-icons/fa";

type SubFilterIconProps = {
  className?: string;
  onClick?: () => void;
};

const SubFilterIcon = forwardRef<HTMLDivElement, SubFilterIconProps>(
  ({ className, onClick }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative flex items-center", className)}
        onClick={onClick}
      >
        <FaFilter className="size-full" />
        <FaCog className="absolute size-3 translate-x-3 translate-y-3/4" />
      </div>
    );
  },
);

export default SubFilterIcon;
