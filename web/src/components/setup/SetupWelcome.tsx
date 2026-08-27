import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type SetupWelcomeProps = {
  onNext: () => void;
  onSkip: () => void;
};

export default function SetupWelcome({ onNext, onSkip }: SetupWelcomeProps) {
  const { t } = useTranslation(["views/setup"]);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <Logo className="h-16 w-16" />
      <div className="text-center">
        <h2 className="text-2xl font-semibold">
          {t("setupWizard.welcome.title")}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {t("setupWizard.welcome.description")}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 pt-4">
        <Button variant="select" className="w-full" onClick={onNext}>
          {t("setupWizard.welcome.getStarted")}
        </Button>
        <button
          className="text-sm text-muted-foreground hover:text-primary"
          onClick={onSkip}
        >
          {t("setupWizard.welcome.skipSetup")}
        </button>
      </div>
    </div>
  );
}
