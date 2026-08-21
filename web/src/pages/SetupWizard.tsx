import StepIndicator from "@/components/indicators/StepIndicator";
import SetupCamera from "@/components/setup/SetupCamera";
import SetupComplete from "@/components/setup/SetupComplete";
import SetupDetector from "@/components/setup/SetupDetector";
import SetupHwAccel from "@/components/setup/SetupHwAccel";
import SetupRecording from "@/components/setup/SetupRecording";
import SetupWelcome from "@/components/setup/SetupWelcome";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/context/theme-provider";
import { useCallback, useReducer } from "react";
import { useTranslation } from "react-i18next";
import { LuMoon, LuSun } from "react-icons/lu";
import { toast } from "sonner";
import axios from "axios";

const STEPS = [
  "setupWizard.steps.welcome",
  "setupWizard.steps.camera",
  "setupWizard.steps.detector",
  "setupWizard.steps.hwaccel",
  "setupWizard.steps.recording",
  "setupWizard.steps.complete",
];

type WizardState = {
  currentStep: number;
  cameraNames: string[];
  detectorHardwareKey?: string;
  // camera name -> detect stream codec
  detectCodecs: Record<string, string>;
  // camera adds apply live, so they don't count toward needing a restart
  restartRequired: boolean;
  configuredSteps: {
    camera: boolean;
    hwaccel: boolean;
    detector: boolean;
    recording: boolean;
  };
};

type WizardAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | {
      type: "CAMERAS_ADDED";
      cameraNames: string[];
      detectCodecs: Record<string, string>;
    }
  | {
      type: "STEP_CONFIGURED";
      step: keyof WizardState["configuredSteps"];
      savedConfig: boolean;
    }
  | { type: "DETECTOR_DONE"; configured: boolean; hardwareKey?: string }
  | { type: "SKIP_STEP" };

const initialState: WizardState = {
  currentStep: 0,
  cameraNames: [],
  detectCodecs: {},
  restartRequired: false,
  configuredSteps: {
    camera: false,
    hwaccel: false,
    detector: false,
    recording: false,
  },
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "NEXT_STEP":
      return { ...state, currentStep: state.currentStep + 1 };
    case "PREV_STEP":
      return {
        ...state,
        currentStep: Math.max(0, state.currentStep - 1),
      };
    case "CAMERAS_ADDED":
      return {
        ...state,
        currentStep: state.currentStep + 1,
        cameraNames: action.cameraNames,
        detectCodecs: action.detectCodecs,
        configuredSteps: { ...state.configuredSteps, camera: true },
      };
    case "STEP_CONFIGURED":
      return {
        ...state,
        currentStep: state.currentStep + 1,
        restartRequired: state.restartRequired || action.savedConfig,
        configuredSteps: { ...state.configuredSteps, [action.step]: true },
      };
    case "DETECTOR_DONE":
      return {
        ...state,
        currentStep: state.currentStep + 1,
        detectorHardwareKey: action.hardwareKey ?? state.detectorHardwareKey,
        restartRequired: state.restartRequired || action.configured,
        configuredSteps: {
          ...state.configuredSteps,
          detector: state.configuredSteps.detector || action.configured,
        },
      };
    case "SKIP_STEP":
      return { ...state, currentStep: state.currentStep + 1 };
    default:
      return state;
  }
}

export default function SetupWizard() {
  const { t } = useTranslation(["views/setup", "common"]);
  const [state, dispatch] = useReducer(wizardReducer, initialState);
  const { theme, systemTheme, setTheme } = useTheme();

  const isDark = (theme === "system" ? systemTheme : theme) === "dark";

  const handleSkipSetup = useCallback(async () => {
    try {
      await axios.put("config/set", {
        config_data: {
          onboarding: { setup_complete: true },
        },
        requires_restart: 0,
      });
      window.location.href = window.baseUrl || "/";
    } catch {
      toast.error(t("setupWizard.errors.saveFailed"));
    }
  }, [t]);

  const handleCameraNext = useCallback(
    (cameraNames?: string[], detectCodecs?: Record<string, string>) => {
      if (cameraNames && cameraNames.length > 0) {
        dispatch({
          type: "CAMERAS_ADDED",
          cameraNames,
          detectCodecs: detectCodecs ?? {},
        });
      } else {
        dispatch({ type: "SKIP_STEP" });
      }
    },
    [],
  );

  const handleHwAccelNext = useCallback((saved: boolean) => {
    dispatch({ type: "STEP_CONFIGURED", step: "hwaccel", savedConfig: saved });
  }, []);

  const handleDetectorNext = useCallback((hardwareKey: string) => {
    dispatch({ type: "DETECTOR_DONE", configured: true, hardwareKey });
  }, []);

  const handleDetectorSkip = useCallback((hardwareKey?: string) => {
    dispatch({ type: "DETECTOR_DONE", configured: false, hardwareKey });
  }, []);

  const handleRecordingNext = useCallback(() => {
    dispatch({ type: "STEP_CONFIGURED", step: "recording", savedConfig: true });
  }, []);

  const handleBack = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  const handleSkipStep = useCallback(() => {
    dispatch({ type: "SKIP_STEP" });
  }, []);

  const renderStep = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <SetupWelcome
            onNext={() => dispatch({ type: "NEXT_STEP" })}
            onSkip={handleSkipSetup}
          />
        );
      case 1:
        return <SetupCamera onNext={handleCameraNext} onBack={handleBack} />;
      case 2:
        return (
          <SetupDetector
            cameraCount={state.cameraNames.length}
            onNext={handleDetectorNext}
            onBack={handleBack}
            onSkip={handleDetectorSkip}
          />
        );
      case 3:
        return (
          <SetupHwAccel
            detectorHardwareKey={state.detectorHardwareKey}
            detectCodecs={state.detectCodecs}
            onNext={handleHwAccelNext}
            onBack={handleBack}
            onSkip={handleSkipStep}
          />
        );
      case 4:
        return (
          <SetupRecording
            cameraNames={state.cameraNames}
            onNext={handleRecordingNext}
            onBack={handleBack}
            onSkip={handleSkipStep}
          />
        );
      case 5:
        return (
          <SetupComplete
            cameraNames={state.cameraNames}
            configuredSteps={state.configuredSteps}
            restartRequired={state.restartRequired}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="fixed right-4 top-4 text-muted-foreground hover:text-primary"
        aria-label={t(isDark ? "menu.darkMode.light" : "menu.darkMode.dark", {
          ns: "common",
        })}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <LuSun className="size-4" /> : <LuMoon className="size-4" />}
      </Button>

      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <StepIndicator
            steps={STEPS}
            currentStep={state.currentStep}
            variant="dots"
            translationNameSpace="views/setup"
            className="mb-4 justify-start"
          />

          <div className="fade-in">{renderStep()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
