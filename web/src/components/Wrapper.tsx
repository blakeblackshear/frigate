import { ReactNode } from "react";

type TWrapperProps = {
  children: ReactNode;
};

const Wrapper = ({ children }: TWrapperProps) => {
  return <main className="flex flex-col h-screen">{children}</main>;
};

export default Wrapper;
