import { ReactNode, useRef } from "react";
import { CSSTransition } from "react-transition-group";

type ChipProps = {
  className?: string;
  children?: ReactNode | ReactNode[];
  in?: boolean;
  onClick?: () => void;
};

export default function Chip({
  className,
  children,
  in: inProp = true,
  onClick,
}: ChipProps) {
  const nodeRef = useRef(null);

  return (
    <CSSTransition
      in={inProp}
      nodeRef={nodeRef}
      timeout={500}
      classNames={{
        enter: "opacity-0",
        enterActive: "opacity-100 transition-opacity duration-500 ease-in-out",
        exit: "opacity-100",
        exitActive: "opacity-0 transition-opacity duration-500 ease-in-out",
      }}
      unmountOnExit
    >
      <div
        ref={nodeRef}
        className={`flex px-2 py-1.5 rounded-2xl items-center z-10 ${className}`}
        onClick={onClick}
      >
        {children}
      </div>
    </CSSTransition>
  );
}
