import { useTranslation } from "react-i18next";
import StepIndicator from "../indicators/StepIndicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useReducer, useEffect } from "react";
import Step1NameAndType, {
  Step1FormData,
} from "@/components/trigger/wizard/Step1NameAndType";
import Step2ConfigureData, {
  Step2FormData,
} from "@/components/trigger/wizard/Step2ConfigureData";
import Step3ThresholdAndActions, {
  Step3FormData,
} from "@/components/trigger/wizard/Step3ThresholdAndActions";
import { cn } from "@/lib/utils";
import { isDesktop } from "react-device-detect";
import { Trigger, TriggerAction, TriggerType } from "@/types/trigger";

const TRIGGER_STEPS = [
  "wizard.steps.nameAndType",
  "wizard.steps.configureData",
  "wizard.steps.thresholdAndActions",
];

type TriggerWizardDialogProps = {
  open: boolean;
  onClose: () => void;
  selectedCamera: string;
  trigger?: Trigger | null;
  onCreate: (
    enabled: boolean,
    name: string,
    type: TriggerType,
    data: string,
    threshold: number,
    actions: TriggerAction[],
    friendly_name: string,
  ) => void;
  onEdit: (trigger: Trigger) => void;
  isLoading?: boolean;
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
        step2Data: undefined,
        step3Data: undefined,
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

export default function TriggerWizardDialog({
  open,
  onClose,
  selectedCamera,
  trigger,
  onCreate,
  onEdit,
  isLoading,
}: TriggerWizardDialogProps) {
  const { t } = useTranslation(["views/settings"]);

  const [wizardState, dispatch] = useReducer(wizardReducer, initialState);

  useEffect(() => {
    if (!open) {
      dispatch({ type: "RESET" });
    }
  }, [open]);

  // Reset wizard state when opening for a different trigger or when creating new
  useEffect(() => {
    if (open) {
      dispatch({ type: "RESET" });
    }
  }, [open, trigger]);

  const handleStep1Next = (data: Step1FormData) => {
    dispatch({ type: "SET_STEP_1", payload: data });
  };

  const handleStep2Next = (data: Step2FormData) => {
    dispatch({ type: "SET_STEP_2", payload: data });
  };

  const handleStep3Next = (data: Step3FormData) => {
    // Combine all step data and call the appropriate callback
    const combinedData = {
      ...wizardState.step1Data!,
      ...wizardState.step2Data!,
      ...data,
    };

    if (trigger) {
      onEdit(combinedData);
    } else {
      onCreate(
        combinedData.enabled,
        combinedData.name,
        combinedData.type,
        combinedData.data,
        combinedData.threshold,
        combinedData.actions,
        combinedData.friendly_name || "",
      );
    }
    // Remove handleClose() - let the parent component handle closing after save completes
  };

  const handleBack = () => {
    dispatch({ type: "PREVIOUS_STEP" });
  };

  const handleClose = () => {
    dispatch({ type: "RESET" });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className={cn(
          "",
          isDesktop &&
            wizardState.currentStep == 1 &&
            wizardState.step1Data?.type == "thumbnail"
            ? "max-h-[90%] max-w-[70%] overflow-y-auto xl:max-h-[80%]"
            : "max-h-[90%] overflow-y-auto xl:max-h-[80%]",
        )}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <StepIndicator
          steps={TRIGGER_STEPS}
          currentStep={wizardState.currentStep}
          variant="dots"
          className="mb-4 justify-start"
        />
        <DialogHeader>
          <DialogTitle>{t("triggers.wizard.title")}</DialogTitle>
          {wizardState.currentStep === 0 && (
            <DialogDescription>
              {t("triggers.wizard.step1.description")}
            </DialogDescription>
          )}
          {wizardState.currentStep === 1 && (
            <DialogDescription>
              {t("triggers.wizard.step2.description")}
            </DialogDescription>
          )}
          {wizardState.currentStep === 2 && (
            <DialogDescription>
              {t("triggers.wizard.step3.description")}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="pb-4">
          {wizardState.currentStep === 0 && (
            <Step1NameAndType
              initialData={wizardState.step1Data}
              trigger={trigger}
              selectedCamera={selectedCamera}
              onNext={handleStep1Next}
              onCancel={handleClose}
            />
          )}
          {wizardState.currentStep === 1 && wizardState.step1Data && (
            <Step2ConfigureData
              initialData={wizardState.step2Data}
              triggerType={wizardState.step1Data.type}
              selectedCamera={selectedCamera}
              onNext={handleStep2Next}
              onBack={handleBack}
            />
          )}
          {wizardState.currentStep === 2 &&
            wizardState.step1Data &&
            wizardState.step2Data && (
              <Step3ThresholdAndActions
                initialData={wizardState.step3Data}
                trigger={trigger}
                camera={selectedCamera}
                onNext={handleStep3Next}
                onBack={handleBack}
                isLoading={isLoading}
              />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
