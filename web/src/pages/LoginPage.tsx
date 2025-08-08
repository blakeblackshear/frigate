import { UserAuthForm } from "@/components/auth/AuthForm";
import Logo from "@/components/Logo";
import { ThemeProvider } from "@/context/theme-provider";
import "@/utils/i18n";
import { LanguageProvider } from "@/context/language-provider";

function LoginPage() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="frigate-ui-theme">
      <LanguageProvider>
        <div className="size-full overflow-hidden">
          <div className="p-8">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
              <div className="flex flex-col items-center space-y-2">
                <Logo className="mb-6 h-8 w-8" />
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
