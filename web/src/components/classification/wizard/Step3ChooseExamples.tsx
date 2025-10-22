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

  const { data: dataset, mutate: refreshDataset } = useSWR<{
    [id: string]: string[];
  }>(hasGenerated ? `classification/${step1Data.modelName}/dataset` : null);

  const unknownImages = useMemo(() => {
    if (!dataset || !dataset.unknown) return [];
    return dataset.unknown;
  }, [dataset]);

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

      await refreshDataset();
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
  }, [step1Data, step2Data, t, refreshDataset]);

  useEffect(() => {
    if (!hasGenerated && !isGenerating) {
      generateExamples();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = useCallback(() => {
    onNext({ examplesGenerated: true, imageClassifications });
  }, [onNext, imageClassifications]);

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
                      src={`${baseUrl}clips/${step1Data.modelName}/dataset/unknown/${imageName}`}
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
