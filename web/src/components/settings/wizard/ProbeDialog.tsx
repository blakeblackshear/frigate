import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import OnvifProbeResults from "./OnvifProbeResults";
import {} from "@/components/ui/card";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import type {
  OnvifProbeResponse,
  CandidateTestMap,
} from "@/types/cameraWizard";
import StepIndicator from "@/components/indicators/StepIndicator";

type ProbeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  probeResult?: OnvifProbeResponse | null;
  onSelectCandidate: (uri: string) => void;
  onRetry: () => void;
  selectedCandidateUris?: string[];
  testAllSelectedCandidates?: () => void;
  isTesting?: boolean;
  testStatus?: string;
  testCandidate?: (uri: string) => void;
  candidateTests?: CandidateTestMap;
  testingCandidates?: Record<string, boolean>;
};

export default function ProbeDialog({
  open,
  onOpenChange,
  isLoading,
  isError,
  error,
  probeResult,
  onSelectCandidate,
  onRetry,
  selectedCandidateUris,
  testAllSelectedCandidates,
  isTesting,
  testStatus,
  testCandidate,
  candidateTests,
  testingCandidates,
}: ProbeDialogProps) {
  const { t } = useTranslation(["views/settings"]);

  const STEPS = [
    "cameraWizard.steps.nameAndConnection",
    "cameraWizard.steps.streamConfiguration",
    "cameraWizard.steps.validationAndTesting",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90%] max-w-3xl overflow-y-auto xl:max-h-[80%]">
        <StepIndicator
          steps={STEPS}
          currentStep={0}
          variant="dots"
          className="mb-4 justify-start"
        />
        <DialogHeader>
          <DialogTitle>{t("cameraWizard.title")}</DialogTitle>
          <DialogDescription>{t("cameraWizard.description")}</DialogDescription>
        </DialogHeader>

        <div className="p-0">
          <OnvifProbeResults
            isLoading={isLoading}
            isError={isError}
            error={error}
            probeResult={probeResult || undefined}
            onSelectCandidate={onSelectCandidate}
            onRetry={onRetry}
            selectedUris={selectedCandidateUris}
            testCandidate={testCandidate}
            candidateTests={candidateTests}
            testingCandidates={testingCandidates}
          />
        </div>

        <div className="mt-4">
          {isTesting && testStatus && (
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
              <ActivityIndicator className="size-4" />
              <span>{testStatus}</span>
            </div>
          )}
          <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
            <Button
              className="flex items-center justify-center gap-2 sm:flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t("button.back", { ns: "common" })}
            </Button>

            <Button
              className="flex items-center justify-center gap-2 sm:flex-1"
              onClick={testAllSelectedCandidates}
              disabled={
                !(selectedCandidateUris && selectedCandidateUris.length > 0) ||
                isLoading ||
                isTesting
              }
              variant="select"
            >
              <span className="flex items-center gap-2">
                {isTesting && <ActivityIndicator className="size-4" />}
                <span>{t("cameraWizard.step1.testConnection")}</span>
              </span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
