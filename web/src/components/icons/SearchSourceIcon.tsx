import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { FaImage } from "react-icons/fa";
import { LuText } from "react-icons/lu";

type SearchSourceIconProps = {
  className?: string;
  onClick?: () => void;
};

const SearchSourceIcon = forwardRef<HTMLDivElement, SearchSourceIconProps>(
  ({ className, onClick }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative flex items-center", className)}
        onClick={onClick}
      >
        <LuText className="absolute size-3 translate-x-3 translate-y-3/4" />
        <FaImage className="size-5" />
      </div>
    );
  },
);

export default SearchSourceIcon;
