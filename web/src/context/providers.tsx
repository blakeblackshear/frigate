import { ReactNode } from "react";
import { ThemeProvider } from "@/context/theme-provider";
import { RecoilRoot } from "recoil";
import { ApiProvider } from "@/api";
import { IconContext } from "react-icons";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StatusBarMessagesProvider } from "@/context/statusbar-provider";
import { LanguageProvider } from "./language-provider";

type TProvidersProps = {
  children: ReactNode;
};

function providers({ children }: TProvidersProps) {
  return (
    <RecoilRoot>
      <ApiProvider>
        <ThemeProvider defaultTheme="system" storageKey="frigate-ui-theme">
          <LanguageProvider>
            <TooltipProvider>
              <IconContext.Provider value={{ size: "20" }}>
                <StatusBarMessagesProvider>
                  {children}
                </StatusBarMessagesProvider>
              </IconContext.Provider>
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </ApiProvider>
    </RecoilRoot>
  );
}

export default providers;
