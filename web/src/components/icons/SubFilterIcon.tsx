import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { FaCog } from "react-icons/fa";
import { MdLabelOutline } from "react-icons/md";

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
        <FaCog className="absolute size-3 translate-x-4 translate-y-[62%]" />
        <MdLabelOutline className="size-full" />
      </div>
    );
  },
);

export default SubFilterIcon;
