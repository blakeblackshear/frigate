import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

type BlurredIconButtonProps = React.HTMLAttributes<HTMLDivElement>;

const BlurredIconButton = forwardRef<HTMLDivElement, BlurredIconButtonProps>(
  ({ className = "", children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group relative inline-flex items-center justify-center",
          className,
        )}
        {...rest}
      >
        <div className="pointer-events-none absolute inset-0 m-auto size-5 scale-95 rounded-full bg-black opacity-0 blur-sm transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 group-hover:blur-xl" />
        <div className="relative z-10 cursor-pointer text-white/85 hover:text-white">
          {children}
        </div>
      </div>
    );
  },
);

BlurredIconButton.displayName = "BlurredIconButton";

export default BlurredIconButton;
