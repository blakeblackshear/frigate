import { ReactNode } from "react";

type TWrapperProps = {
  children: ReactNode;
};

const Wrapper = ({ children }: TWrapperProps) => {
  return <main className="w-screen h-screen overflow-hidden">{children}</main>;
};

export default Wrapper;
