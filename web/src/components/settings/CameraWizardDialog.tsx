import StepIndicator from "@/components/indicators/StepIndicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { useCallback, useState, useEffect, useReducer } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import axios from "axios";
import Step1NameCamera from "./Step1NameCamera";
import Step2StreamConfig from "./Step2StreamConfig";
import Step3Validation from "./Step3Validation";
import type {
  WizardFormData,
  CameraConfigData,
  ConfigSetBody,
} from "@/types/cameraWizard";
import { processCameraName } from "@/utils/cameraUtil";

type WizardState = {
  wizardData: Partial<WizardFormData>;
  shouldNavigateNext: boolean;
};

type WizardAction =
  | { type: "UPDATE_DATA"; payload: Partial<WizardFormData> }
  | { type: "UPDATE_AND_NEXT"; payload: Partial<WizardFormData> }
  | { type: "RESET_NAVIGATE" };

const wizardReducer = (
  state: WizardState,
  action: WizardAction,
): WizardState => {
  switch (action.type) {
    case "UPDATE_DATA":
      return {
        ...state,
        wizardData: { ...state.wizardData, ...action.payload },
      };
    case "UPDATE_AND_NEXT":
      return {
        wizardData: { ...state.wizardData, ...action.payload },
        shouldNavigateNext: true,
      };
    case "RESET_NAVIGATE":
      return { ...state, shouldNavigateNext: false };
    default:
      return state;
  }
};

const STEPS = [
  "cameraWizard.steps.nameAndConnection",
  "cameraWizard.steps.streamConfiguration",
  "cameraWizard.steps.validationAndTesting",
];

type CameraWizardDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function CameraWizardDialog({
  open,
  onClose,
}: CameraWizardDialogProps) {
  const { t } = useTranslation(["views/settings"]);
  const { mutate: updateConfig } = useSWR("config");
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [state, dispatch] = useReducer(wizardReducer, {
    wizardData: { streams: [] },
    shouldNavigateNext: false,
  });

  // Reset wizard when opened
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      dispatch({ type: "UPDATE_DATA", payload: { streams: [] } });
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setCurrentStep(0);
    dispatch({ type: "UPDATE_DATA", payload: { streams: [] } });
    onClose();
  }, [onClose]);

  const onUpdate = useCallback((data: Partial<WizardFormData>) => {
    dispatch({ type: "UPDATE_DATA", payload: data });
  }, []);

  const canProceedToNext = useCallback((): boolean => {
    switch (currentStep) {
      case 0:
        // Can proceed if camera name is set and at least one stream exists
        return !!(
          state.wizardData.cameraName &&
          (state.wizardData.streams?.length ?? 0) > 0
        );
      case 1:
        // Can proceed if at least one stream has 'detect' role
        return !!(
          state.wizardData.streams?.some((stream) =>
            stream.roles.includes("detect"),
          ) ?? false
        );
      case 2:
        // Always can proceed from final step (save will be handled there)
        return true;
      default:
        return false;
    }
  }, [currentStep, state.wizardData]);

  const handleNext = useCallback(
    (data?: Partial<WizardFormData>) => {
      if (data) {
        // Atomic update and navigate
        dispatch({ type: "UPDATE_AND_NEXT", payload: data });
      } else {
        // Just navigate
        if (currentStep < STEPS.length - 1 && canProceedToNext()) {
          setCurrentStep((s) => s + 1);
        }
      }
    },
    [currentStep, canProceedToNext],
  );

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle navigation after atomic update
  useEffect(() => {
    if (state.shouldNavigateNext) {
      if (currentStep < STEPS.length - 1 && canProceedToNext()) {
        setCurrentStep((s) => s + 1);
      }
      dispatch({ type: "RESET_NAVIGATE" });
    }
  }, [state.shouldNavigateNext, currentStep, canProceedToNext]);

  // Handle wizard save
  const handleSave = useCallback(
    (wizardData: WizardFormData) => {
      if (!wizardData.cameraName || !wizardData.streams) {
        toast.error("Invalid wizard data");
        return;
      }

      setIsLoading(true);

      // Process camera name and friendly name
      const { finalCameraName, friendlyName } = processCameraName(
        wizardData.cameraName,
      );

      // Convert wizard data to Frigate config format
      const configData: CameraConfigData = {
        cameras: {
          [finalCameraName]: {
            enabled: true,
            ...(friendlyName && { friendly_name: friendlyName }),
            ffmpeg: {
              inputs: wizardData.streams.map((stream, index) => {
                const isRestreamed =
                  wizardData.restreamIds?.includes(stream.id) ?? false;
                if (isRestreamed) {
                  const go2rtcStreamName =
                    wizardData.streams!.length === 1
                      ? finalCameraName
                      : `${finalCameraName}_${index + 1}`;
                  return {
                    path: `rtsp://127.0.0.1:8554/${go2rtcStreamName}`,
                    input_args: "preset-rtsp-restream",
                    roles: stream.roles,
                  };
                } else {
                  return {
                    path: stream.url,
                    roles: stream.roles,
                  };
                }
              }),
            },
          },
        },
      };

      // Add live.streams configuration for go2rtc streams
      if (wizardData.streams && wizardData.streams.length > 0) {
        configData.cameras[finalCameraName].live = {
          streams: {},
        };
        wizardData.streams.forEach((_, index) => {
          const go2rtcStreamName =
            wizardData.streams!.length === 1
              ? finalCameraName
              : `${finalCameraName}_${index + 1}`;
          configData.cameras[finalCameraName].live!.streams[
            `Stream ${index + 1}`
          ] = go2rtcStreamName;
        });
      }

      const requestBody: ConfigSetBody = {
        requires_restart: 1,
        config_data: configData,
        update_topic: `config/cameras/${finalCameraName}/add`,
      };

      axios
        .put("config/set", requestBody)
        .then((response) => {
          if (response.status === 200) {
            // Configure go2rtc streams for all streams
            if (wizardData.streams && wizardData.streams.length > 0) {
              const go2rtcStreams: Record<string, string[]> = {};

              wizardData.streams.forEach((stream, index) => {
                // Use camera name with index suffix for multiple streams
                const streamName =
                  wizardData.streams!.length === 1
                    ? finalCameraName
                    : `${finalCameraName}_${index + 1}`;
                go2rtcStreams[streamName] = [stream.url];
              });

              if (Object.keys(go2rtcStreams).length > 0) {
                // Update frigate go2rtc config for persistence
                const go2rtcConfigData = {
                  go2rtc: {
                    streams: go2rtcStreams,
                  },
                };

                const go2rtcRequestBody = {
                  requires_restart: 0,
                  config_data: go2rtcConfigData,
                };

                axios
                  .put("config/set", go2rtcRequestBody)
                  .then(() => {
                    // also update the running go2rtc instance for immediate effect
                    const updatePromises = Object.entries(go2rtcStreams).map(
                      ([streamName, urls]) =>
                        axios.put(
                          `go2rtc/streams/${streamName}?src=${encodeURIComponent(urls[0])}`,
                        ),
                    );

                    Promise.allSettled(updatePromises).then(() => {
                      toast.success(
                        t("cameraWizard.save.successWithLive", {
                          cameraName: friendlyName || finalCameraName,
                        }),
                        { position: "top-center" },
                      );
                      updateConfig();
                      onClose();
                    });
                  })
                  .catch(() => {
                    // log the error but don't fail the entire save
                    toast.warning(
                      t("cameraWizard.save.successWithoutLive", {
                        cameraName: friendlyName || finalCameraName,
                      }),
                      { position: "top-center" },
                    );
                    updateConfig();
                    onClose();
                  });
              } else {
                // No valid streams found
                toast.success(
                  t("cameraWizard.save.successWithoutLive", {
                    cameraName: friendlyName || finalCameraName,
                  }),
                  { position: "top-center" },
                );
                updateConfig();
                onClose();
              }
            } else {
              toast.success(
                t("camera.cameraConfig.toast.success", {
                  cameraName: wizardData.cameraName,
                }),
                { position: "top-center" },
              );
              updateConfig();
              onClose();
            }
          } else {
            throw new Error(response.statusText);
          }
        })
        .catch((error) => {
          const apiError = error as {
            response?: { data?: { message?: string; detail?: string } };
            message?: string;
          };
          const errorMessage =
            apiError.response?.data?.message ||
            apiError.response?.data?.detail ||
            apiError.message ||
            "Unknown error";

          toast.error(
            t("toast.save.error.title", {
              errorMessage,
              ns: "common",
            }),
            { position: "top-center" },
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [updateConfig, t, onClose],
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
          <DialogTitle>{t("cameraWizard.title")}</DialogTitle>
          {currentStep === 0 && (
            <DialogDescription>
              {t("cameraWizard.description")}
            </DialogDescription>
          )}
        </DialogHeader>

        {currentStep > 0 && state.wizardData.cameraName && (
          <div className="text-center text-primary-variant md:text-start">
            {state.wizardData.cameraName}
          </div>
        )}

        <div className="pb-4">
          <div className="size-full">
            {currentStep === 0 && (
              <Step1NameCamera
                wizardData={state.wizardData}
                onUpdate={onUpdate}
                onNext={handleNext}
                onCancel={handleClose}
                canProceed={canProceedToNext()}
              />
            )}
            {currentStep === 1 && (
              <Step2StreamConfig
                wizardData={state.wizardData}
                onUpdate={onUpdate}
                onBack={handleBack}
                onNext={handleNext}
                canProceed={canProceedToNext()}
              />
            )}
            {currentStep === 2 && (
              <Step3Validation
                wizardData={state.wizardData}
                onUpdate={onUpdate}
                onSave={handleSave}
                onBack={handleBack}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
