import { ReactNode } from "react";
import { ThemeProvider } from "@/context/theme-provider";
import { RecoilRoot } from "recoil";
import { ApiProvider } from "@/api";
import { IconContext } from "react-icons";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StatusBarMessagesProvider } from "@/context/statusbar-provider";
import { GlobalStateProvider } from "@/context/global-state-provider";

type TProvidersProps = {
  children: ReactNode;
};

function Providers({ children }: TProvidersProps) {
  return (
    <RecoilRoot>
      <ApiProvider>
        <ThemeProvider defaultTheme="system" storageKey="frigate-ui-theme">
          <TooltipProvider>
            <IconContext.Provider value={{ size: "20" }}>
              <StatusBarMessagesProvider>
                <GlobalStateProvider>{children}</GlobalStateProvider>
              </StatusBarMessagesProvider>
            </IconContext.Provider>
          </TooltipProvider>
        </ThemeProvider>
      </ApiProvider>
    </RecoilRoot>
  );
}

export default Providers;
