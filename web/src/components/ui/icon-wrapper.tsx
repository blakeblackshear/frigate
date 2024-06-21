import { ForwardedRef, forwardRef } from "react";
import { IconType } from "react-icons";

interface IconWrapperProps {
  icon: IconType;
  className?: string;
  [key: string]: any;
}

const IconWrapper = forwardRef(
  (
    { icon: Icon, className, ...props }: IconWrapperProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) => (
    <div {...props} ref={ref}>
      <Icon className={className} />
    </div>
  ),
);

export default IconWrapper;
