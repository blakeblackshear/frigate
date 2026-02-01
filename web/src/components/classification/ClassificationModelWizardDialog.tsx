import { useTranslation } from "react-i18next";
import StepIndicator from "../indicators/StepIndicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useReducer, useMemo } from "react";
import Step1NameAndDefine, { Step1FormData } from "./wizard/Step1NameAndDefine";
import Step2StateArea, { Step2FormData } from "./wizard/Step2StateArea";
import Step3ChooseExamples, {
  Step3FormData,
} from "./wizard/Step3ChooseExamples";
import { cn } from "@/lib/utils";
import { isDesktop } from "react-device-detect";
import axios from "axios";

const OBJECT_STEPS = [
  "wizard.steps.nameAndDefine",
  "wizard.steps.chooseExamples",
];

const STATE_STEPS = [
  "wizard.steps.nameAndDefine",
  "wizard.steps.stateArea",
  "wizard.steps.chooseExamples",
];

type ClassificationModelWizardDialogProps = {
  open: boolean;
  onClose: () => void;
  defaultModelType?: "state" | "object";
};

type WizardState = {
  currentStep: number;
  step1Data?: Step1FormData;
  step2Data?: Step2FormData;
  step3Data?: Step3FormData;
};

type WizardAction =
  | { type: "NEXT_STEP"; payload?: Partial<WizardState> }
  | { type: "PREVIOUS_STEP" }
  | { type: "SET_STEP_1"; payload: Step1FormData }
  | { type: "SET_STEP_2"; payload: Step2FormData }
  | { type: "SET_STEP_3"; payload: Step3FormData }
  | { type: "RESET" };

const initialState: WizardState = {
  currentStep: 0,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP_1":
      return {
        ...state,
        step1Data: action.payload,
        currentStep: 1,
      };
    case "SET_STEP_2":
      return {
        ...state,
        step2Data: action.payload,
        currentStep: 2,
      };
    case "SET_STEP_3":
      return {
        ...state,
        step3Data: action.payload,
        currentStep: 3,
      };
    case "NEXT_STEP":
      return {
        ...state,
        ...action.payload,
        currentStep: state.currentStep + 1,
      };
    case "PREVIOUS_STEP":
      return {
        ...state,
        currentStep: Math.max(0, state.currentStep - 1),
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export default function ClassificationModelWizardDialog({
  open,
  onClose,
  defaultModelType,
}: ClassificationModelWizardDialogProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  const [wizardState, dispatch] = useReducer(wizardReducer, initialState);

  const steps = useMemo(() => {
    if (!wizardState.step1Data) {
      return OBJECT_STEPS;
    }
    return wizardState.step1Data.modelType === "state"
      ? STATE_STEPS
      : OBJECT_STEPS;
  }, [wizardState.step1Data]);

  const handleStep1Next = (data: Step1FormData) => {
    dispatch({ type: "SET_STEP_1", payload: data });
  };

  const handleStep2Next = (data: Step2FormData) => {
    dispatch({ type: "SET_STEP_2", payload: data });
  };

  const handleBack = () => {
    dispatch({ type: "PREVIOUS_STEP" });
  };

  const handleCancel = async () => {
    // Clean up any generated training images if we're cancelling from Step 3
    if (wizardState.step1Data && wizardState.step3Data?.examplesGenerated) {
      try {
        await axios.delete(
          `/classification/${wizardState.step1Data.modelName}`,
        );
      } catch (error) {
        // Silently fail - user is already cancelling
      }
    }

    dispatch({ type: "RESET" });
    onClose();
  };

  const handleSuccessClose = () => {
    dispatch({ type: "RESET" });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          handleCancel();
        }
      }}
    >
      <DialogContent
        className={cn(
          "",
          isDesktop &&
            wizardState.currentStep == 0 &&
            "max-h-[90%] overflow-y-auto xl:max-h-[80%]",
          isDesktop &&
            wizardState.currentStep > 0 &&
            "max-h-[90%] max-w-[70%] overflow-y-auto xl:max-h-[80%]",
        )}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <StepIndicator
          steps={steps}
          currentStep={wizardState.currentStep}
          variant="dots"
          className="mb-4 justify-start"
        />
        <DialogHeader>
          <DialogTitle>{t("wizard.title")}</DialogTitle>
          {wizardState.currentStep === 0 && (
            <DialogDescription>
              {t("wizard.step1.description")}
            </DialogDescription>
          )}
          {wizardState.currentStep === 1 &&
            wizardState.step1Data?.modelType === "state" && (
              <DialogDescription>
                {t("wizard.step2.description")}
              </DialogDescription>
            )}
        </DialogHeader>

        <div className="pb-4">
          {wizardState.currentStep === 0 && (
            <Step1NameAndDefine
              initialData={wizardState.step1Data}
              defaultModelType={defaultModelType}
              onNext={handleStep1Next}
              onCancel={handleCancel}
            />
          )}
          {wizardState.currentStep === 1 &&
            wizardState.step1Data?.modelType === "state" && (
              <Step2StateArea
                initialData={wizardState.step2Data}
                onNext={handleStep2Next}
                onBack={handleBack}
              />
            )}
          {((wizardState.currentStep === 2 &&
            wizardState.step1Data?.modelType === "state") ||
            (wizardState.currentStep === 1 &&
              wizardState.step1Data?.modelType === "object")) &&
            wizardState.step1Data && (
              <Step3ChooseExamples
                step1Data={wizardState.step1Data}
                step2Data={wizardState.step2Data}
                initialData={wizardState.step3Data}
                onClose={handleSuccessClose}
                onBack={handleBack}
              />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
