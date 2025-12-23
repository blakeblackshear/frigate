import { UserAuthForm } from "@/components/auth/AuthForm";
import { ThemeProvider } from "@/context/theme-provider";
import "@/utils/i18n";
import { LanguageProvider } from "@/context/language-provider";

// Resolve the SVG from the non-public images directory
const dienstLogo = new URL("../../images/branding/Dienst-Logo_extendedY.svg", import.meta.url).href;

function LoginPage() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="frigate-ui-theme">
      <LanguageProvider>
        <div className="size-full overflow-hidden">
          <div className="p-8">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
              <div className="flex flex-col items-center space-y-2">
                <img
                  src={dienstLogo}
                  alt="Dienst logo"
                  className="mb-6 h-12 w-auto"
                  loading="lazy"
                />
              </div>
              <UserAuthForm />
            </div>
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default LoginPage;
