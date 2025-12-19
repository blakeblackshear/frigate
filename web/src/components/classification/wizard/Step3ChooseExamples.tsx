import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useMemo } from "react";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import axios from "axios";
import { toast } from "sonner";
import { Step1FormData } from "./Step1NameAndDefine";
import { Step2FormData } from "./Step2StateArea";
import useSWR from "swr";
import { baseUrl } from "@/api/baseUrl";
import { isMobile } from "react-device-detect";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { IoIosWarning } from "react-icons/io";

export type Step3FormData = {
  examplesGenerated: boolean;
  imageClassifications?: { [imageName: string]: string };
};

type Step3ChooseExamplesProps = {
  step1Data: Step1FormData;
  step2Data?: Step2FormData;
  initialData?: Partial<Step3FormData>;
  onClose: () => void;
  onBack: () => void;
};

export default function Step3ChooseExamples({
  step1Data,
  step2Data,
  initialData,
  onClose,
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
  const [isTraining, setIsTraining] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentClassIndex, setCurrentClassIndex] = useState(0);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [cacheKey, setCacheKey] = useState<number>(Date.now());
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = useCallback((imageName: string) => {
    setLoadedImages((prev) => new Set(prev).add(imageName));
  }, []);

  const { data: trainImages, mutate: refreshTrainImages } = useSWR<string[]>(
    hasGenerated ? `classification/${step1Data.modelName}/train` : null,
  );

  const unknownImages = useMemo(() => {
    if (!trainImages) return [];
    return trainImages;
  }, [trainImages]);

  const toggleImageSelection = useCallback((imageName: string) => {
    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(imageName)) {
        newSet.delete(imageName);
      } else {
        newSet.add(imageName);
      }
      return newSet;
    });
  }, []);

  // Get all classes (excluding "none" - it will be auto-assigned)
  const allClasses = useMemo(() => {
    return [...step1Data.classes];
  }, [step1Data.classes]);

  const currentClass = allClasses[currentClassIndex];

  const processClassificationsAndTrain = useCallback(
    async (classifications: { [imageName: string]: string }) => {
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
      const categorizePromises = Object.entries(classifications).map(
        ([imageName, className]) => {
          if (!className) return Promise.resolve();
          return axios.post(
            `/classification/${step1Data.modelName}/dataset/categorize`,
            {
              training_file: imageName,
              category: className === "none" ? "none" : className,
            },
          );
        },
      );
      await Promise.all(categorizePromises);

      // Step 2.5: Delete any unselected images from train folder
      // For state models, all images must be classified, so unselected images should be removed
      // For object models, unselected images are assigned to "none" so they're already categorized
      if (step1Data.modelType === "state") {
        try {
          // Fetch current train images to see what's left after categorization
          const trainImagesResponse = await axios.get<string[]>(
            `/classification/${step1Data.modelName}/train`,
          );
          const remainingTrainImages = trainImagesResponse.data || [];

          const categorizedImageNames = new Set(Object.keys(classifications));
          const unselectedImages = remainingTrainImages.filter(
            (imageName) => !categorizedImageNames.has(imageName),
          );

          if (unselectedImages.length > 0) {
            await axios.post(
              `/classification/${step1Data.modelName}/train/delete`,
              {
                ids: unselectedImages,
              },
            );
          }
        } catch (error) {
          // Silently fail - unselected images will remain but won't cause issues
          // since the frontend filters out images that don't match expected format
        }
      }

      // Step 2.6: Create empty folders for classes that don't have any images
      // This ensures all classes are available in the dataset view later
      const classesWithImages = new Set(
        Object.values(classifications).filter((c) => c && c !== "none"),
      );
      const emptyFolderPromises = step1Data.classes
        .filter((className) => !classesWithImages.has(className))
        .map((className) =>
          axios.post(
            `/classification/${step1Data.modelName}/dataset/${className}/create`,
          ),
        );
      await Promise.all(emptyFolderPromises);

      // Step 3: Determine if we should train
      // For state models, we need ALL states to have examples (at least 2 states)
      // For object models, we need at least 1 class with images (the rest go to "none")
      const allStatesHaveExamplesForTraining =
        step1Data.modelType !== "state" ||
        step1Data.classes.every((className) =>
          classesWithImages.has(className),
        );
      const shouldTrain =
        step1Data.modelType === "object"
          ? classesWithImages.size >= 1
          : allStatesHaveExamplesForTraining && classesWithImages.size >= 2;

      // Step 4: Kick off training only if we have enough classes with images
      if (shouldTrain) {
        await axios.post(`/classification/${step1Data.modelName}/train`);

        toast.success(t("wizard.step3.trainingStarted"), {
          closeButton: true,
        });
        setIsTraining(true);
      } else {
        // Don't train - not all states have examples
        toast.success(t("wizard.step3.modelCreated"), {
          closeButton: true,
        });
        setIsTraining(false);
        onClose();
      }
    },
    [step1Data, step2Data, t, onClose],
  );

  const handleContinueClassification = useCallback(async () => {
    // Mark selected images with current class
    const newClassifications = { ...imageClassifications };

    // Handle user going back and de-selecting images
    const imagesToCheck = unknownImages.slice(0, 24);
    imagesToCheck.forEach((imageName) => {
      if (
        newClassifications[imageName] === currentClass &&
        !selectedImages.has(imageName)
      ) {
        delete newClassifications[imageName];
      }
    });

    // Then, add all currently selected images to the current class
    selectedImages.forEach((imageName) => {
      newClassifications[imageName] = currentClass;
    });

    // Check if we're on the last class to select
    const isLastClass = currentClassIndex === allClasses.length - 1;

    if (isLastClass) {
      // For object models, assign remaining unclassified images to "none"
      // For state models, this should never happen since we require all images to be classified
      if (step1Data.modelType !== "state") {
        unknownImages.slice(0, 24).forEach((imageName) => {
          if (!newClassifications[imageName]) {
            newClassifications[imageName] = "none";
          }
        });
      }

      // All done, trigger training immediately
      setImageClassifications(newClassifications);
      setIsProcessing(true);

      try {
        await processClassificationsAndTrain(newClassifications);
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
        setIsProcessing(false);
      }
    } else {
      // Move to next class
      setImageClassifications(newClassifications);
      setCurrentClassIndex((prev) => prev + 1);
      setSelectedImages(new Set());
    }
  }, [
    selectedImages,
    currentClass,
    currentClassIndex,
    allClasses,
    imageClassifications,
    unknownImages,
    step1Data,
    processClassificationsAndTrain,
    t,
  ]);

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

      // Update cache key to force image reload
      setCacheKey(Date.now());
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
    setIsProcessing(true);
    try {
      await processClassificationsAndTrain(imageClassifications);
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
      setIsProcessing(false);
    }
  }, [imageClassifications, processClassificationsAndTrain, t]);

  const unclassifiedImages = useMemo(() => {
    if (!unknownImages) return [];
    const images = unknownImages.slice(0, 24);

    // Only filter if we have any classifications
    if (Object.keys(imageClassifications).length === 0) {
      return images;
    }

    // If we're viewing a previous class (going back), show images for that class
    // Otherwise show only unclassified images
    const currentClassInView = allClasses[currentClassIndex];
    return images.filter((img) => {
      const imgClass = imageClassifications[img];
      // Show if: unclassified OR classified with current class we're viewing
      return !imgClass || imgClass === currentClassInView;
    });
  }, [unknownImages, imageClassifications, allClasses, currentClassIndex]);

  const allImagesClassified = useMemo(() => {
    return unclassifiedImages.length === 0;
  }, [unclassifiedImages]);

  const isLastClass = currentClassIndex === allClasses.length - 1;
  const statesWithExamples = useMemo(() => {
    if (step1Data.modelType !== "state") return new Set<string>();

    const states = new Set<string>();
    const allImages = unknownImages.slice(0, 24);

    // Check which states have at least one image classified
    allImages.forEach((img) => {
      let className: string | undefined;
      if (selectedImages.has(img)) {
        className = currentClass;
      } else {
        className = imageClassifications[img];
      }
      if (className && allClasses.includes(className)) {
        states.add(className);
      }
    });

    return states;
  }, [
    step1Data.modelType,
    unknownImages,
    imageClassifications,
    selectedImages,
    currentClass,
    allClasses,
  ]);

  const allStatesHaveExamples = useMemo(() => {
    if (step1Data.modelType !== "state") return true;
    return allClasses.every((className) => statesWithExamples.has(className));
  }, [step1Data.modelType, allClasses, statesWithExamples]);

  const hasUnclassifiedImages = useMemo(() => {
    if (!unknownImages) return false;
    const allImages = unknownImages.slice(0, 24);
    return allImages.some((img) => !imageClassifications[img]);
  }, [unknownImages, imageClassifications]);

  const showMissingStatesWarning = useMemo(() => {
    return (
      step1Data.modelType === "state" &&
      isLastClass &&
      !allStatesHaveExamples &&
      !hasUnclassifiedImages &&
      hasGenerated
    );
  }, [
    step1Data.modelType,
    isLastClass,
    allStatesHaveExamples,
    hasUnclassifiedImages,
    hasGenerated,
  ]);

  const handleBack = useCallback(() => {
    if (currentClassIndex > 0) {
      const previousClass = allClasses[currentClassIndex - 1];
      setCurrentClassIndex((prev) => prev - 1);

      // Restore selections for the previous class
      const previousSelections = Object.entries(imageClassifications)
        .filter(([_, className]) => className === previousClass)
        .map(([imageName, _]) => imageName);
      setSelectedImages(new Set(previousSelections));
    } else {
      onBack();
    }
  }, [currentClassIndex, allClasses, imageClassifications, onBack]);

  return (
    <div className="flex flex-col gap-6">
      {isTraining ? (
        <div className="flex flex-col items-center gap-6 py-12">
          <ActivityIndicator className="size-12" />
          <div className="text-center">
            <h3 className="mb-2 text-lg font-medium">
              {t("wizard.step3.training.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("wizard.step3.training.description")}
            </p>
          </div>
          <Button onClick={onClose} variant="select" className="mt-4">
            {t("button.close", { ns: "common" })}
          </Button>
        </div>
      ) : isGenerating ? (
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
          {showMissingStatesWarning && (
            <Alert variant="destructive">
              <IoIosWarning className="size-5" />
              <AlertTitle>
                {t("wizard.step3.missingStatesWarning.title")}
              </AlertTitle>
              <AlertDescription>
                {t("wizard.step3.missingStatesWarning.description")}
              </AlertDescription>
            </Alert>
          )}
          {!allImagesClassified && (
            <div className="text-center">
              <h3 className="text-lg font-medium">
                {t("wizard.step3.selectImagesPrompt", {
                  className: currentClass,
                })}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("wizard.step3.selectImagesDescription")}
              </p>
            </div>
          )}
          <div
            className={cn(
              "rounded-lg bg-secondary/30 p-4",
              isMobile && "max-h-[60vh] overflow-y-auto",
            )}
          >
            {!unknownImages || unknownImages.length === 0 ? (
              <div className="flex h-[40vh] flex-col items-center justify-center gap-4">
                <p className="text-muted-foreground">
                  {t("wizard.step3.noImages")}
                </p>
                <Button onClick={generateExamples} variant="select">
                  {t("wizard.step3.retryGenerate")}
                </Button>
              </div>
            ) : allImagesClassified && isProcessing ? (
              <div className="flex h-[40vh] flex-col items-center justify-center gap-4">
                <ActivityIndicator className="size-12" />
                <p className="text-lg font-medium">
                  {t("wizard.step3.classifying")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
                {unclassifiedImages.map((imageName, index) => {
                  const isSelected = selectedImages.has(imageName);
                  return (
                    <div
                      key={imageName}
                      className={cn(
                        "aspect-square cursor-pointer overflow-hidden rounded-lg border-2 bg-background transition-all",
                        isSelected && "border-selected ring-2 ring-selected",
                      )}
                      onClick={() => toggleImageSelection(imageName)}
                    >
                      {!loadedImages.has(imageName) && (
                        <div className="flex h-full items-center justify-center">
                          <ActivityIndicator className="size-6" />
                        </div>
                      )}
                      <img
                        src={`${baseUrl}clips/${step1Data.modelName}/train/${imageName}?t=${cacheKey}`}
                        alt={`Example ${index + 1}`}
                        className="h-full w-full object-cover"
                        onLoad={() => handleImageLoad(imageName)}
                      />
                    </div>
                  );
                })}
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

      {!isTraining && (
        <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
          <Button type="button" onClick={handleBack} className="sm:flex-1">
            {t("button.back", { ns: "common" })}
          </Button>
          <Button
            type="button"
            onClick={
              allImagesClassified
                ? handleContinue
                : handleContinueClassification
            }
            variant="select"
            className="flex items-center justify-center gap-2 sm:flex-1"
            disabled={!hasGenerated || isGenerating || isProcessing}
          >
            {isProcessing && <ActivityIndicator className="size-4" />}
            {t("button.continue", { ns: "common" })}
          </Button>
        </div>
      )}
    </div>
  );
}
