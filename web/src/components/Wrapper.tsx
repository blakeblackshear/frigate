import { ReactNode } from "react";

type TWrapperProps = {
  children: ReactNode;
};

const Wrapper = ({ children }: TWrapperProps) => {
  return <main className="flex flex-col max-h-screen">{children}</main>;
};

export default Wrapper;
