import { useEffect, useState } from "react";
import axios from "axios";
import { getPostLoginUrl } from "@/api/auth-redirect";
import { UserAuthForm } from "@/components/auth/AuthForm";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Logo from "@/components/Logo";
import { ThemeProvider } from "@/context/theme-provider";
import "@/utils/i18n";
import { LanguageProvider } from "@/context/language-provider";

// show the login form if the session check stalls instead of a blank page
const SESSION_CHECK_TIMEOUT_MS = 5000;

function LoginPage() {
  const [checkingSession, setCheckingSession] = useState(true);

  // skip the login form when the user already has a valid session
  useEffect(() => {
    axios
      .get("/profile", {
        withCredentials: true,
        timeout: SESSION_CHECK_TIMEOUT_MS,
      })
      .then(() => {
        window.location.replace(getPostLoginUrl());
      })
      .catch(() => {
        setCheckingSession(false);
      });
  }, []);

  return (
    <ThemeProvider defaultTheme="system" storageKey="frigate-ui-theme">
      <LanguageProvider>
        <div className="size-full overflow-hidden">
          <div className="p-8">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
              <div className="flex flex-col items-center space-y-2">
                <Logo className="mb-6 h-8 w-8" />
              </div>
              {checkingSession ? <ActivityIndicator /> : <UserAuthForm />}
            </div>
          </div>
        </div>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default LoginPage;
