import { ReactNode } from "react";
import { ThemeProvider } from "@/context/theme-provider";
import { RecoilRoot } from "recoil";
import { ApiProvider } from "@/api";
import { IconContext } from "react-icons";

type TProvidersProps = {
  children: ReactNode;
};

function providers({ children }: TProvidersProps) {
  return (
    <RecoilRoot>
      <ApiProvider>
        <ThemeProvider defaultTheme="light" storageKey="frigate-ui-theme">
          <IconContext.Provider value={{ size: "20" }}>
            {children}
          </IconContext.Provider>
        </ThemeProvider>
      </ApiProvider>
    </RecoilRoot>
  );
}

export default providers;
