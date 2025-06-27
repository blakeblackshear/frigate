import { baseUrl } from "@/api/baseUrl";
import TextEntryDialog from "@/components/overlay/dialog/TextEntryDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import useOptimisticState from "@/hooks/use-optimistic-state";
import { cn } from "@/lib/utils";
import { CustomClassificationModelConfig } from "@/types/frigateConfig";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { Trans, useTranslation } from "react-i18next";
import { LuPencil, LuTrash2 } from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";
import ClassificationSelectionDialog from "@/components/overlay/ClassificationSelectionDialog";
import { TbCategoryPlus } from "react-icons/tb";
import { useModelState } from "@/api/ws";
import { ModelState } from "@/types/ws";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useNavigate } from "react-router-dom";
import { IoMdArrowRoundBack } from "react-icons/io";

type ModelTrainingViewProps = {
  model: CustomClassificationModelConfig;
};
export default function ModelTrainingView({ model }: ModelTrainingViewProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const navigate = useNavigate();
  const [page, setPage] = useState<string>("train");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);

  // model state

  const [wasTraining, setWasTraining] = useState(false);
  const { payload: lastModelState } = useModelState(model.name, true);
  const modelState = useMemo<ModelState>(() => {
    if (!lastModelState || lastModelState == "downloaded") {
      return "complete";
    }

    return lastModelState;
  }, [lastModelState]);

  useEffect(() => {
    if (!wasTraining) {
      return;
    }

    if (modelState == "complete") {
      toast.success(t("toast.success.trainedModel"), {
        position: "top-center",
      });
      setWasTraining(false);
    }
    // only refresh when modelState changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelState]);

  // dataset

  const { data: trainImages, mutate: refreshTrain } = useSWR<string[]>(
    `classification/${model.name}/train`,
  );
  const { data: dataset, mutate: refreshDataset } = useSWR<{
    [id: string]: string[];
  }>(`classification/${model.name}/dataset`);

  // image multiselect

  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  const onClickImages = useCallback(
    (images: string[], ctrl: boolean) => {
      if (selectedImages.length == 0 && !ctrl) {
        return;
      }

      let newSelectedImages = [...selectedImages];

      images.forEach((imageId) => {
        const index = newSelectedImages.indexOf(imageId);

        if (index != -1) {
          if (selectedImages.length == 1) {
            newSelectedImages = [];
          } else {
            const copy = [
              ...newSelectedImages.slice(0, index),
              ...newSelectedImages.slice(index + 1),
            ];
            newSelectedImages = copy;
          }
        } else {
          newSelectedImages.push(imageId);
        }
      });

      setSelectedImages(newSelectedImages);
    },
    [selectedImages, setSelectedImages],
  );

  // actions

  const trainModel = useCallback(() => {
    axios
      .post(`classification/${model.name}/train`)
      .then((resp) => {
        if (resp.status == 200) {
          setWasTraining(true);
          toast.success(t("toast.success.trainingModel"), {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";

        toast.error(t("toast.error.trainingFailed", { errorMessage }), {
          position: "top-center",
        });
      });
  }, [model, t]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string[] | null>(
    null,
  );

  const onDelete = useCallback(
    (ids: string[], isName: boolean = false) => {
      const api =
        pageToggle == "train"
          ? `/classification/${model.name}/train/delete`
          : `/classification/${model.name}/dataset/${pageToggle}/delete`;

      axios
        .post(api, { ids })
        .then((resp) => {
          setSelectedImages([]);

          if (resp.status == 200) {
            if (isName) {
              toast.success(
                t("toast.success.deletedCategory", { count: ids.length }),
                {
                  position: "top-center",
                },
              );
            } else {
              toast.success(
                t("toast.success.deletedImage", { count: ids.length }),
                {
                  position: "top-center",
                },
              );
            }

            if (pageToggle == "train") {
              refreshTrain();
            } else {
              refreshDataset();
            }
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          if (isName) {
            toast.error(
              t("toast.error.deleteCategoryFailed", { errorMessage }),
              {
                position: "top-center",
              },
            );
          } else {
            toast.error(t("toast.error.deleteImageFailed", { errorMessage }), {
              position: "top-center",
            });
          }
        });
    },
    [pageToggle, model, refreshTrain, refreshDataset, t],
  );

  // keyboard

  useKeyboardListener(["a", "Escape"], (key, modifiers) => {
    if (modifiers.repeat || !modifiers.down) {
      return;
    }

    switch (key) {
      case "a":
        if (modifiers.ctrl) {
          if (selectedImages.length) {
            setSelectedImages([]);
          } else {
            setSelectedImages([
              ...(pageToggle === "train"
                ? trainImages || []
                : dataset?.[pageToggle] || []),
            ]);
          }
        }
        break;
      case "Escape":
        setSelectedImages([]);
        break;
    }
  });

  useEffect(() => {
    setSelectedImages([]);
  }, [pageToggle]);

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <Toaster />

      <AlertDialog
        open={!!deleteDialogOpen}
        onOpenChange={() => setDeleteDialogOpen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                pageToggle == "train"
                  ? "deleteTrainImages.title"
                  : "deleteDatasetImages.title",
              )}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <Trans
              ns="views/classificationModel"
              values={{ count: deleteDialogOpen?.length, dataset: pageToggle }}
            >
              {pageToggle == "train"
                ? "deleteTrainImages.desc"
                : "deleteDatasetImages.desc"}
            </Trans>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => {
                if (deleteDialogOpen) {
                  onDelete(deleteDialogOpen);
                  setDeleteDialogOpen(null);
                }
              }}
            >
              {t("button.delete", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-row justify-between gap-2 p-2 align-middle">
        <div className="flex flex-row items-center justify-center gap-2">
          <Button
            className="flex items-center gap-2.5 rounded-lg"
            aria-label={t("label.back", { ns: "common" })}
            onClick={() => navigate(-1)}
          >
            <IoMdArrowRoundBack className="size-5 text-secondary-foreground" />
            {isDesktop && (
              <div className="text-primary">
                {t("button.back", { ns: "common" })}
              </div>
            )}
          </Button>
          <LibrarySelector
            pageToggle={pageToggle}
            dataset={dataset || {}}
            trainImages={trainImages || []}
            setPageToggle={setPageToggle}
            onDelete={onDelete}
            onRename={() => {}}
          />
        </div>
        {selectedImages?.length > 0 ? (
          <div className="flex items-center justify-center gap-2">
            <div className="mx-1 flex w-48 items-center justify-center text-sm text-muted-foreground">
              <div className="p-1">{`${selectedImages.length} selected`}</div>
              <div className="p-1">{"|"}</div>
              <div
                className="cursor-pointer p-2 text-primary hover:rounded-lg hover:bg-secondary"
                onClick={() => setSelectedImages([])}
              >
                {t("button.unselect", { ns: "common" })}
              </div>
            </div>
            <Button
              className="flex gap-2"
              onClick={() => setDeleteDialogOpen(selectedImages)}
            >
              <LuTrash2 className="size-7 rounded-md p-1 text-secondary-foreground" />
              {isDesktop && t("button.deleteImages")}
            </Button>
          </div>
        ) : (
          <Button
            className="flex justify-center gap-2"
            onClick={trainModel}
            disabled={modelState != "complete"}
          >
            Train Model
            {modelState == "training" && <ActivityIndicator size={20} />}
          </Button>
        )}
      </div>
      {pageToggle == "train" ? (
        <TrainGrid
          model={model}
          classes={Object.keys(dataset || {})}
          trainImages={trainImages || []}
          selectedImages={selectedImages}
          onRefresh={refreshTrain}
          onClickImages={onClickImages}
          onDelete={onDelete}
        />
      ) : (
        <DatasetGrid
          modelName={model.name}
          categoryName={pageToggle}
          images={dataset?.[pageToggle] || []}
          selectedImages={selectedImages}
          onClickImages={onClickImages}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

type LibrarySelectorProps = {
  pageToggle: string | undefined;
  dataset: { [id: string]: string[] };
  trainImages: string[];
  setPageToggle: (toggle: string) => void;
  onDelete: (ids: string[], isName: boolean) => void;
  onRename: (old_name: string, new_name: string) => void;
};
function LibrarySelector({
  pageToggle,
  dataset,
  trainImages,
  setPageToggle,
  onDelete,
  onRename,
}: LibrarySelectorProps) {
  const { t } = useTranslation(["views/classificationModel"]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renameClass, setRenameFace] = useState<string | null>(null);

  const handleDeleteFace = useCallback(
    (name: string) => {
      // Get all image IDs for this face
      const imageIds = dataset?.[name] || [];

      onDelete(imageIds, true);
      setPageToggle("train");
    },
    [dataset, onDelete, setPageToggle],
  );

  const handleSetOpen = useCallback(
    (open: boolean) => {
      setRenameFace(open ? renameClass : null);
    },
    [renameClass],
  );

  return (
    <>
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteCategory.title")}</DialogTitle>
            <DialogDescription>
              {t("deleteCategory.desc", { name: confirmDelete })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              {t("button.cancel", { ns: "common" })}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) {
                  handleDeleteFace(confirmDelete);
                  setConfirmDelete(null);
                }
              }}
            >
              {t("button.delete", { ns: "common" })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TextEntryDialog
        open={!!renameClass}
        setOpen={handleSetOpen}
        title={t("renameCategory.title")}
        description={t("renameCategory.desc", { name: renameClass })}
        onSave={(newName) => {
          onRename(renameClass!, newName);
          setRenameFace(null);
        }}
        defaultValue={renameClass || ""}
        regexPattern={/^[\p{L}\p{N}\s'_-]{1,50}$/u}
        regexErrorMessage={t("description.invalidName")}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex justify-between smart-capitalize">
            {pageToggle == "train" ? t("train.title") : pageToggle}
            <span className="ml-2 text-primary-variant">
              (
              {(pageToggle &&
                (pageToggle == "train"
                  ? trainImages.length
                  : dataset?.[pageToggle]?.length)) ||
                0}
              )
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="scrollbar-container max-h-[40dvh] min-w-[220px] overflow-y-auto"
          align="start"
        >
          <DropdownMenuItem
            className="flex cursor-pointer items-center justify-start gap-2"
            aria-label={t("train.aria")}
            onClick={() => setPageToggle("train")}
          >
            <div>{t("train.title")}</div>
            <div className="text-secondary-foreground">
              ({trainImages.length})
            </div>
          </DropdownMenuItem>
          {trainImages.length > 0 && Object.keys(dataset).length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="mb-1 ml-1.5 text-xs text-secondary-foreground">
                {t("categories")}
              </div>
            </>
          )}
          {Object.keys(dataset).map((id) => (
            <DropdownMenuItem
              key={id}
              className="group flex items-center justify-between"
            >
              <div
                className="flex-grow cursor-pointer capitalize"
                onClick={() => setPageToggle(id)}
              >
                {id.replaceAll("_", " ")}
                <span className="ml-2 text-muted-foreground">
                  ({dataset?.[id].length})
                </span>
              </div>
              <div className="flex gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameFace(id);
                      }}
                    >
                      <LuPencil className="size-4 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent>
                      {t("button.renameCategory")}
                    </TooltipContent>
                  </TooltipPortal>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete(id);
                      }}
                    >
                      <LuTrash2 className="size-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent>
                      {t("button.deleteCategory")}
                    </TooltipContent>
                  </TooltipPortal>
                </Tooltip>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

type DatasetGridProps = {
  modelName: string;
  categoryName: string;
  images: string[];
  selectedImages: string[];
  onClickImages: (images: string[], ctrl: boolean) => void;
  onDelete: (ids: string[]) => void;
};
function DatasetGrid({
  modelName,
  categoryName,
  images,
  selectedImages,
  onClickImages,
  onDelete,
}: DatasetGridProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  return (
    <div className="flex flex-wrap gap-2 overflow-y-auto p-2">
      {images.map((image) => (
        <div
          className={cn(
            "flex w-60 cursor-pointer flex-col gap-2 rounded-lg bg-card outline outline-[3px]",
            selectedImages.includes(image)
              ? "shadow-selected outline-selected"
              : "outline-transparent duration-500",
          )}
          onClick={(e) => {
            e.stopPropagation();

            if (e.ctrlKey || e.metaKey) {
              onClickImages([image], true);
            }
          }}
        >
          <div
            className={cn(
              "w-full overflow-hidden p-2 *:text-card-foreground",
              isMobile && "flex justify-center",
            )}
          >
            <img
              className="rounded-lg"
              src={`${baseUrl}clips/${modelName}/dataset/${categoryName}/${image}`}
            />
          </div>
          <div className="rounded-b-lg bg-card p-3">
            <div className="flex w-full flex-row items-center justify-between gap-2">
              <div className="flex w-full flex-row items-start justify-end gap-5 md:gap-4">
                <Tooltip>
                  <TooltipTrigger>
                    <LuTrash2
                      className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete([image]);
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("button.deleteClassificationAttempts")}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type TrainGridProps = {
  model: CustomClassificationModelConfig;
  classes: string[];
  trainImages: string[];
  selectedImages: string[];
  onClickImages: (images: string[], ctrl: boolean) => void;
  onRefresh: () => void;
  onDelete: (ids: string[]) => void;
};
function TrainGrid({
  model,
  classes,
  trainImages,
  selectedImages,
  onClickImages,
  onRefresh,
  onDelete,
}: TrainGridProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  const trainData = useMemo(
    () =>
      trainImages
        .map((raw) => {
          const parts = raw.replaceAll(".webp", "").split("-");
          const rawScore = Number.parseFloat(parts[2]);
          return {
            raw,
            timestamp: parts[0],
            label: parts[1],
            score: rawScore * 100,
            truePositive: rawScore >= model.threshold,
          };
        })
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [model, trainImages],
  );

  return (
    <div className="flex flex-wrap gap-2 overflow-y-auto p-2">
      {trainData?.map((data) => (
        <div
          key={data.timestamp}
          className={cn(
            "flex w-56 cursor-pointer flex-col gap-2 rounded-lg bg-card outline outline-[3px]",
            selectedImages.includes(data.raw)
              ? "shadow-selected outline-selected"
              : "outline-transparent duration-500",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onClickImages([data.raw], e.ctrlKey || e.metaKey);
          }}
        >
          <div
            className={cn(
              "w-full overflow-hidden p-2 *:text-card-foreground",
              isMobile && "flex justify-center",
            )}
          >
            <img
              className="w-56 rounded-lg"
              src={`${baseUrl}clips/${model.name}/train/${data.raw}`}
            />
          </div>
          <div className="rounded-b-lg bg-card p-3">
            <div className="flex w-full flex-row items-center justify-between gap-2">
              <div className="flex flex-col items-start text-xs text-primary-variant">
                <div className="smart-capitalize">
                  {data.label.replaceAll("_", " ")}
                </div>
                <div
                  className={cn(
                    "",
                    data.truePositive ? "text-success" : "text-danger",
                  )}
                >
                  {data.score}%
                </div>
              </div>
              <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
                <ClassificationSelectionDialog
                  classes={classes}
                  modelName={model.name}
                  image={data.raw}
                  onRefresh={onRefresh}
                >
                  <TbCategoryPlus className="size-5 cursor-pointer text-primary-variant hover:text-primary" />
                </ClassificationSelectionDialog>
                <Tooltip>
                  <TooltipTrigger>
                    <LuTrash2
                      className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete([data.raw]);
                      }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("button.deleteClassificationAttempts")}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
