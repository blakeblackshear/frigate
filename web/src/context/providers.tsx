import { ReactNode } from "react";
import { ThemeProvider } from "@/context/theme-provider";
import { RecoilRoot } from "recoil";
import { ApiProvider } from "@/api";
import { IconContext } from "react-icons";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StatusBarMessagesProvider } from "@/context/statusbar-provider";
import { StreamingSettingsProvider } from "./streaming-settings-provider";
import { AuthProvider } from "./auth-context";

type TProvidersProps = {
  children: ReactNode;
};

function providers({ children }: TProvidersProps) {
  return (
    <RecoilRoot>
      <AuthProvider>
        <ApiProvider>
          <ThemeProvider defaultTheme="system" storageKey="frigate-ui-theme">
            <TooltipProvider>
              <IconContext.Provider value={{ size: "20" }}>
                <StatusBarMessagesProvider>
                  <StreamingSettingsProvider>
                    {children}
                  </StreamingSettingsProvider>
                </StatusBarMessagesProvider>
              </IconContext.Provider>
            </TooltipProvider>
          </ThemeProvider>
        </ApiProvider>
      </AuthProvider>
    </RecoilRoot>
  );
}

export default providers;
