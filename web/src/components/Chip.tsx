import { ReactNode } from "react";

type ChipProps = {
  className?: string;
  children?: ReactNode[];
};
export default function Chip({ className, children }: ChipProps) {
  return (
    <div className={`flex p-1 rounded-lg items-center ${className}`}>
      {children}
    </div>
  );
}
