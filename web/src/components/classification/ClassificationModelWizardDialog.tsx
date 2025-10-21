import { useTranslation } from "react-i18next";
import StepIndicator from "../indicators/StepIndicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useState } from "react";

const STEPS = [
  "classificationWizard.steps.nameAndDefine",
  "classificationWizard.steps.stateArea",
  "classificationWizard.steps.chooseExamples",
  "classificationWizard.steps.train",
];

type ClassificationModelWizardDialogProps = {
  open: boolean;
  onClose: () => void;
};
export default function ClassificationModelWizardDialog({
  open,
  onClose,
}: ClassificationModelWizardDialogProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  // step management
  const [currentStep, _] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          onClose;
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
          steps={STEPS}
          currentStep={currentStep}
          variant="dots"
          className="mb-4 justify-start"
        />
        <DialogHeader>
          <DialogTitle>{t("wizard.title")}</DialogTitle>
          {currentStep === 0 && (
            <DialogDescription>{t("wizard.description")}</DialogDescription>
          )}
        </DialogHeader>

        <div className="pb-4">
          <div className="size-full"></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
