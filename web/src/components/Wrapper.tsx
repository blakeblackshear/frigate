import { ReactNode } from "react";

type TWrapperProps = {
  children: ReactNode;
};

const Wrapper = ({ children }: TWrapperProps) => {
  return <main className="h-dvh w-full overflow-hidden">{children}</main>;
};

export default Wrapper;
