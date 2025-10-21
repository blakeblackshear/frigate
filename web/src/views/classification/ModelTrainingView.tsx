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
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import TrainFilterDialog from "@/components/overlay/dialog/TrainFilterDialog";
import useApiFilter from "@/hooks/use-api-filter";
import { ClassificationItemData, TrainFilter } from "@/types/classification";
import {
  ClassificationCard,
  GroupedClassificationCard,
} from "@/components/card/ClassificationCard";
import { Event } from "@/types/event";
import SearchDetailDialog, {
  SearchTab,
} from "@/components/overlay/detail/SearchDetailDialog";
import { SearchResult } from "@/types/search";
import { HiSparkles } from "react-icons/hi";

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

  const [trainFilter, setTrainFilter] = useApiFilter<TrainFilter>();

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

  const contentRef = useRef<HTMLDivElement | null>(null);
  useKeyboardListener(
    ["a", "Escape"],
    (key, modifiers) => {
      if (!modifiers.down) {
        return true;
      }

      switch (key) {
        case "a":
          if (modifiers.ctrl && !modifiers.repeat) {
            if (selectedImages.length) {
              setSelectedImages([]);
            } else {
              setSelectedImages([
                ...(pageToggle === "train"
                  ? trainImages || []
                  : dataset?.[pageToggle] || []),
              ]);
            }
            return true;
          }
          break;
        case "Escape":
          setSelectedImages([]);
          return true;
      }

      return false;
    },
    contentRef,
  );

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
          <div className="flex flex-row gap-2">
            <TrainFilterDialog
              filter={trainFilter}
              filterValues={{ classes: Object.keys(dataset || {}) }}
              onUpdateFilter={setTrainFilter}
            />
            <Button
              className="flex justify-center gap-2"
              onClick={trainModel}
              variant="select"
              disabled={modelState != "complete"}
            >
              {modelState == "training" ? (
                <ActivityIndicator size={20} />
              ) : (
                <HiSparkles className="text-white" />
              )}
              {isDesktop && t("button.trainModel")}
            </Button>
          </div>
        )}
      </div>
      {pageToggle == "train" ? (
        <TrainGrid
          model={model}
          contentRef={contentRef}
          classes={Object.keys(dataset || {})}
          trainImages={trainImages || []}
          trainFilter={trainFilter}
          selectedImages={selectedImages}
          onRefresh={refreshTrain}
          onClickImages={onClickImages}
          onDelete={onDelete}
        />
      ) : (
        <DatasetGrid
          contentRef={contentRef}
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
              className="text-white"
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
  contentRef: MutableRefObject<HTMLDivElement | null>;
  modelName: string;
  categoryName: string;
  images: string[];
  selectedImages: string[];
  onClickImages: (images: string[], ctrl: boolean) => void;
  onDelete: (ids: string[]) => void;
};
function DatasetGrid({
  contentRef,
  modelName,
  categoryName,
  images,
  selectedImages,
  onClickImages,
  onDelete,
}: DatasetGridProps) {
  const { t } = useTranslation(["views/classificationModel"]);

  const classData = useMemo(
    () => images.sort((a, b) => a.localeCompare(b)),
    [images],
  );

  return (
    <div
      ref={contentRef}
      className="scrollbar-container flex flex-wrap gap-2 overflow-y-auto p-2"
    >
      {classData.map((image) => (
        <ClassificationCard
          key={image}
          imgClassName="size-auto"
          data={{
            filename: image,
            filepath: `clips/${modelName}/dataset/${categoryName}/${image}`,
            name: "",
          }}
          selected={selectedImages.includes(image)}
          i18nLibrary="views/classificationModel"
          onClick={(data, _) => onClickImages([data.filename], true)}
        >
          <Tooltip>
            <TooltipTrigger>
              <LuTrash2
                className="size-5 cursor-pointer text-primary-variant hover:text-danger"
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
        </ClassificationCard>
      ))}
    </div>
  );
}

type TrainGridProps = {
  model: CustomClassificationModelConfig;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  classes: string[];
  trainImages: string[];
  trainFilter?: TrainFilter;
  selectedImages: string[];
  onClickImages: (images: string[], ctrl: boolean) => void;
  onRefresh: () => void;
  onDelete: (ids: string[]) => void;
};
function TrainGrid({
  model,
  contentRef,
  classes,
  trainImages,
  trainFilter,
  selectedImages,
  onClickImages,
  onRefresh,
  onDelete,
}: TrainGridProps) {
  const trainData = useMemo<ClassificationItemData[]>(
    () =>
      trainImages
        .map((raw) => {
          const parts = raw.replaceAll(".webp", "").split("-");
          const rawScore = Number.parseFloat(parts[4]);
          return {
            filename: raw,
            filepath: `clips/${model.name}/train/${raw}`,
            timestamp: Number.parseFloat(parts[2]),
            eventId: `${parts[0]}-${parts[1]}`,
            name: parts[3],
            score: rawScore,
          };
        })
        .filter((data) => {
          if (!trainFilter) {
            return true;
          }

          if (trainFilter.classes && !trainFilter.classes.includes(data.name)) {
            return false;
          }

          if (
            trainFilter.min_score &&
            trainFilter.min_score > data.score / 100.0
          ) {
            return false;
          }

          if (
            trainFilter.max_score &&
            trainFilter.max_score < data.score / 100.0
          ) {
            return false;
          }

          return true;
        })
        .sort((a, b) => b.timestamp - a.timestamp),
    [model, trainImages, trainFilter],
  );

  if (model.state_config) {
    return (
      <StateTrainGrid
        model={model}
        contentRef={contentRef}
        classes={classes}
        trainData={trainData}
        selectedImages={selectedImages}
        onClickImages={onClickImages}
        onRefresh={onRefresh}
        onDelete={onDelete}
      />
    );
  }

  return (
    <ObjectTrainGrid
      model={model}
      contentRef={contentRef}
      classes={classes}
      trainData={trainData}
      selectedImages={selectedImages}
      onClickImages={onClickImages}
      onRefresh={onRefresh}
    />
  );
}

type StateTrainGridProps = {
  model: CustomClassificationModelConfig;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  classes: string[];
  trainData?: ClassificationItemData[];
  selectedImages: string[];
  onClickImages: (images: string[], ctrl: boolean) => void;
  onRefresh: () => void;
  onDelete: (ids: string[]) => void;
};
function StateTrainGrid({
  model,
  contentRef,
  classes,
  trainData,
  selectedImages,
  onClickImages,
  onRefresh,
}: StateTrainGridProps) {
  const threshold = useMemo(() => {
    return {
      recognition: model.threshold,
      unknown: model.threshold,
    };
  }, [model]);

  return (
    <div
      ref={contentRef}
      className={cn(
        "scrollbar-container flex flex-wrap gap-3 overflow-y-auto p-2",
        isMobile && "justify-center",
      )}
    >
      {trainData?.map((data) => (
        <ClassificationCard
          key={data.filename}
          imgClassName="size-auto"
          data={data}
          threshold={threshold}
          selected={selectedImages.includes(data.filename)}
          i18nLibrary="views/classificationModel"
          showArea={false}
          onClick={(data, meta) => onClickImages([data.filename], meta)}
        >
          <ClassificationSelectionDialog
            classes={classes}
            modelName={model.name}
            image={data.filename}
            onRefresh={onRefresh}
          >
            <TbCategoryPlus className="size-7 cursor-pointer p-1 text-gray-200 hover:rounded-full hover:bg-primary-foreground" />
          </ClassificationSelectionDialog>
        </ClassificationCard>
      ))}
    </div>
  );
}

type ObjectTrainGridProps = {
  model: CustomClassificationModelConfig;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  classes: string[];
  trainData?: ClassificationItemData[];
  selectedImages: string[];
  onClickImages: (images: string[], ctrl: boolean) => void;
  onRefresh: () => void;
};
function ObjectTrainGrid({
  model,
  contentRef,
  classes,
  trainData,
  selectedImages,
  onClickImages,
  onRefresh,
}: ObjectTrainGridProps) {
  // item data

  const groups = useMemo(() => {
    const groups: { [eventId: string]: ClassificationItemData[] } = {};

    trainData
      ?.sort((a, b) => a.eventId!.localeCompare(b.eventId!))
      .reverse()
      .forEach((data) => {
        if (groups[data.eventId!]) {
          groups[data.eventId!].push(data);
        } else {
          groups[data.eventId!] = [data];
        }
      });

    return groups;
  }, [trainData]);

  const eventIdsQuery = useMemo(() => Object.keys(groups).join(","), [groups]);

  const { data: events } = useSWR<Event[]>([
    "event_ids",
    { ids: eventIdsQuery },
  ]);

  const threshold = useMemo(() => {
    return {
      recognition: model.threshold,
      unknown: model.threshold,
    };
  }, [model]);

  // selection

  const [selectedEvent, setSelectedEvent] = useState<Event>();
  const [dialogTab, setDialogTab] = useState<SearchTab>("details");

  // handlers

  const handleClickEvent = useCallback(
    (
      group: ClassificationItemData[],
      event: Event | undefined,
      meta: boolean,
    ) => {
      if (event && selectedImages.length == 0 && !meta) {
        setSelectedEvent(event);
      } else {
        const anySelected =
          group.find((item) => selectedImages.includes(item.filename)) !=
          undefined;

        if (anySelected) {
          // deselect all
          const toDeselect: string[] = [];
          group.forEach((item) => {
            if (selectedImages.includes(item.filename)) {
              toDeselect.push(item.filename);
            }
          });
          onClickImages(toDeselect, false);
        } else {
          // select all
          onClickImages(
            group.map((item) => item.filename),
            true,
          );
        }
      }
    },
    [selectedImages, onClickImages],
  );

  return (
    <>
      <SearchDetailDialog
        search={
          selectedEvent ? (selectedEvent as unknown as SearchResult) : undefined
        }
        page={dialogTab}
        setSimilarity={undefined}
        setSearchPage={setDialogTab}
        setSearch={(search) => setSelectedEvent(search as unknown as Event)}
        setInputFocused={() => {}}
      />

      <div
        ref={contentRef}
        className="scrollbar-container flex flex-wrap gap-3 overflow-y-scroll p-1"
      >
        {Object.entries(groups).map(([key, group]) => {
          const event = events?.find((ev) => ev.id == key);
          return (
            <GroupedClassificationCard
              key={key}
              group={group}
              event={event}
              threshold={threshold}
              selectedItems={selectedImages}
              i18nLibrary="views/classificationModel"
              objectType={model.object_config?.objects?.at(0) ?? "Object"}
              onClick={(data) => {
                if (data) {
                  onClickImages([data.filename], true);
                } else {
                  handleClickEvent(group, event, true);
                }
              }}
            >
              {(data) => (
                <>
                  <ClassificationSelectionDialog
                    classes={classes}
                    modelName={model.name}
                    image={data.filename}
                    onRefresh={onRefresh}
                  >
                    <TbCategoryPlus className="size-7 cursor-pointer p-1 text-gray-200 hover:rounded-full hover:bg-primary-foreground" />
                  </ClassificationSelectionDialog>
                </>
              )}
            </GroupedClassificationCard>
          );
        })}
      </div>
    </>
  );
}
