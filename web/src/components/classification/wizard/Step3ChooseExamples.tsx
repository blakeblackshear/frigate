import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useMemo } from "react";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import axios from "axios";
import { toast } from "sonner";
import { Step1FormData } from "./Step1NameAndDefine";
import { Step2FormData } from "./Step2StateArea";
import useSWR from "swr";
import { baseUrl } from "@/api/baseUrl";

export type Step3FormData = {
  examplesGenerated: boolean;
  imageClassifications?: { [imageName: string]: string };
};

type Step3ChooseExamplesProps = {
  step1Data: Step1FormData;
  step2Data?: Step2FormData;
  initialData?: Partial<Step3FormData>;
  onNext: (data: Step3FormData) => void;
  onBack: () => void;
};

export default function Step3ChooseExamples({
  step1Data,
  step2Data,
  initialData,
  onNext,
  onBack,
}: Step3ChooseExamplesProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(
    initialData?.examplesGenerated || false,
  );
  const [imageClassifications, setImageClassifications] = useState<{
    [imageName: string]: string;
  }>(initialData?.imageClassifications || {});

  const { data: trainImages, mutate: refreshTrainImages } = useSWR<string[]>(
    hasGenerated ? `classification/${step1Data.modelName}/train` : null,
  );

  const unknownImages = useMemo(() => {
    if (!trainImages) return [];
    return trainImages;
  }, [trainImages]);

  const handleClassificationChange = useCallback(
    (imageName: string, className: string) => {
      setImageClassifications((prev) => ({
        ...prev,
        [imageName]: className,
      }));
    },
    [],
  );

  const generateExamples = useCallback(async () => {
    setIsGenerating(true);

    try {
      if (step1Data.modelType === "state") {
        // For state models, use cameras and crop areas
        if (!step2Data?.cameraAreas || step2Data.cameraAreas.length === 0) {
          toast.error(t("wizard.step3.errors.noCameras"));
          setIsGenerating(false);
          return;
        }

        const cameras: { [key: string]: [number, number, number, number] } = {};
        step2Data.cameraAreas.forEach((area) => {
          cameras[area.camera] = area.crop;
        });

        await axios.post("/classification/generate_examples/state", {
          model_name: step1Data.modelName,
          cameras,
        });
      } else {
        // For object models, use label
        if (!step1Data.objectLabel) {
          toast.error(t("wizard.step3.errors.noObjectLabel"));
          setIsGenerating(false);
          return;
        }

        // For now, use all enabled cameras
        // TODO: In the future, we might want to let users select specific cameras
        await axios.post("/classification/generate_examples/object", {
          model_name: step1Data.modelName,
          label: step1Data.objectLabel,
        });
      }

      setHasGenerated(true);
      toast.success(t("wizard.step3.generateSuccess"));

      await refreshTrainImages();
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { message?: string; detail?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.detail ||
        axiosError.message ||
        "Failed to generate examples";

      toast.error(
        t("wizard.step3.errors.generateFailed", { error: errorMessage }),
      );
    } finally {
      setIsGenerating(false);
    }
  }, [step1Data, step2Data, t, refreshTrainImages]);

  useEffect(() => {
    if (!hasGenerated && !isGenerating) {
      generateExamples();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = useCallback(async () => {
    try {
      // Step 1: Create config for the new model
      const modelConfig: {
        enabled: boolean;
        name: string;
        threshold: number;
        state_config?: {
          cameras: Record<string, { crop: number[] }>;
          motion: boolean;
        };
        object_config?: { objects: string[]; classification_type: string };
      } = {
        enabled: true,
        name: step1Data.modelName,
        threshold: 0.8,
      };

      if (step1Data.modelType === "state") {
        // State model config
        const cameras: Record<string, { crop: number[] }> = {};
        step2Data?.cameraAreas.forEach((area) => {
          cameras[area.camera] = {
            crop: area.crop,
          };
        });

        modelConfig.state_config = {
          cameras,
          motion: true,
        };
      } else {
        // Object model config
        modelConfig.object_config = {
          objects: step1Data.objectLabel ? [step1Data.objectLabel] : [],
          classification_type: step1Data.objectType || "sub_label",
        } as { objects: string[]; classification_type: string };
      }

      // Update config via config API
      await axios.put("/config/set", {
        requires_restart: 0,
        update_topic: `config/classification/custom/${step1Data.modelName}`,
        config_data: {
          classification: {
            custom: {
              [step1Data.modelName]: modelConfig,
            },
          },
        },
      });

      // Step 2: Classify each image by moving it to the correct category folder
      for (const [imageName, className] of Object.entries(
        imageClassifications,
      )) {
        if (!className) continue;

        await axios.post(
          `/classification/${step1Data.modelName}/dataset/categorize`,
          {
            training_file: imageName,
            category: className === "none" ? "none" : className,
          },
        );
      }

      // Step 3: Kick off training
      await axios.post(`/classification/${step1Data.modelName}/train`);

      toast.success(t("wizard.step3.trainingStarted"));
      onNext({ examplesGenerated: true, imageClassifications });
    } catch (error) {
      const axiosError = error as {
        response?: { data?: { message?: string; detail?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.detail ||
        axiosError.message ||
        "Failed to classify images";

      toast.error(
        t("wizard.step3.errors.classifyFailed", { error: errorMessage }),
      );
    }
  }, [onNext, imageClassifications, step1Data, step2Data, t]);

  const allImagesClassified = useMemo(() => {
    if (!unknownImages || unknownImages.length === 0) return false;
    const imagesToClassify = unknownImages.slice(0, 24);
    return imagesToClassify.every((img) => imageClassifications[img]);
  }, [unknownImages, imageClassifications]);

  return (
    <div className="flex flex-col gap-6">
      {isGenerating ? (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
          <ActivityIndicator className="size-12" />
          <div className="text-center">
            <h3 className="mb-2 text-lg font-medium">
              {t("wizard.step3.generating.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("wizard.step3.generating.description")}
            </p>
          </div>
        </div>
      ) : hasGenerated ? (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">
            {t("wizard.step3.description")}
          </div>
          <div className="rounded-lg bg-secondary/30 p-4">
            {!unknownImages || unknownImages.length === 0 ? (
              <div className="flex h-[40vh] items-center justify-center">
                <p className="text-muted-foreground">
                  {t("wizard.step3.noImages")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-3">
                {unknownImages.slice(0, 24).map((imageName, index) => (
                  <div
                    key={imageName}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border bg-background transition-all hover:ring-2 hover:ring-primary"
                  >
                    <img
                      src={`${baseUrl}clips/${step1Data.modelName}/train/${imageName}`}
                      alt={`Example ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <Select
                        value={imageClassifications[imageName] || ""}
                        onValueChange={(value) =>
                          handleClassificationChange(imageName, value)
                        }
                      >
                        <SelectTrigger className="h-7 bg-background/20 text-xs">
                          <SelectValue
                            placeholder={t("wizard.step3.selectClass")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {step1Data.modelType === "object" && (
                            <SelectItem
                              value="none"
                              className="cursor-pointer text-xs"
                            >
                              {t("wizard.step3.none")}
                            </SelectItem>
                          )}
                          {step1Data.classes.map((className) => (
                            <SelectItem
                              key={className}
                              value={className}
                              className="cursor-pointer text-xs"
                            >
                              {className}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
          <p className="text-sm text-destructive">
            {t("wizard.step3.errors.generationFailed")}
          </p>
          <Button onClick={generateExamples} variant="select">
            {t("wizard.step3.retryGenerate")}
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
        <Button type="button" onClick={onBack} className="sm:flex-1">
          {t("button.back", { ns: "common" })}
        </Button>
        <Button
          type="button"
          onClick={handleContinue}
          variant="select"
          className="flex items-center justify-center gap-2 sm:flex-1"
          disabled={!hasGenerated || isGenerating || !allImagesClassified}
        >
          {t("button.continue", { ns: "common" })}
        </Button>
      </div>
    </div>
  );
}
