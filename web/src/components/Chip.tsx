import { ReactNode } from "react";

type ChipProps = {
  className?: string;
  children?: ReactNode[];
};
export default function Chip({ className, children }: ChipProps) {
  return (
    <div className={`flex px-2 py-1.5 rounded-2xl items-center ${className}`}>
      {children}
    </div>
  );
}
