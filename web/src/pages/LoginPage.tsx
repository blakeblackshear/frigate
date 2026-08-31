import { UserAuthForm } from "@/components/auth/AuthForm";
import Logo from "@/components/Logo";
import { useEffect } from "react";
import { setRedirectingToLogin } from "@/api/auth-redirect";

function LoginPage() {
  // Clear the redirect guard once the login page is shown so a redirect
  // can happen again if the user navigates away without logging in.
  useEffect(() => {
    setRedirectingToLogin(false);
  }, []);

  return (
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
  );
}

export default LoginPage;
