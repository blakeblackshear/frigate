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

const OBJECT_STEPS = [
  "wizard.steps.nameAndDefine",
  "wizard.steps.chooseExamples",
  "wizard.steps.train",
];

const STATE_STEPS = [
  "wizard.steps.nameAndDefine",
  "wizard.steps.stateArea",
  "wizard.steps.chooseExamples",
  "wizard.steps.train",
];

type ClassificationModelWizardDialogProps = {
  open: boolean;
  onClose: () => void;
};

type WizardState = {
  currentStep: number;
  step1Data?: Step1FormData;
  // Future steps can be added here
  // step2Data?: Step2FormData;
  // step3Data?: Step3FormData;
};

type WizardAction =
  | { type: "NEXT_STEP"; payload?: Partial<WizardState> }
  | { type: "PREVIOUS_STEP" }
  | { type: "SET_STEP_1"; payload: Step1FormData }
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

  const handleCancel = () => {
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
        className="max-h-[90dvh] max-w-4xl overflow-y-auto"
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
            <DialogDescription>{t("wizard.description")}</DialogDescription>
          )}
        </DialogHeader>

        <div className="pb-4">
          {wizardState.currentStep === 0 && (
            <Step1NameAndDefine
              initialData={wizardState.step1Data}
              onNext={handleStep1Next}
              onCancel={handleCancel}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
