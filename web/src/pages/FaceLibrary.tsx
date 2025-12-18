import AddFaceIcon from "@/components/icons/AddFaceIcon";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import CreateFaceWizardDialog from "@/components/overlay/detail/FaceCreateWizardDialog";
import TextEntryDialog from "@/components/overlay/dialog/TextEntryDialog";
import UploadImageDialog from "@/components/overlay/dialog/UploadImageDialog";
import FaceSelectionDialog from "@/components/overlay/FaceSelectionDialog";
import { Button, buttonVariants } from "@/components/ui/button";
import BlurredIconButton from "@/components/button/BlurredIconButton";
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
import { Event } from "@/types/event";
import { FaceLibraryData } from "@/types/face";
import { FrigateConfig } from "@/types/frigateConfig";
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
import { isDesktop, isMobileOnly } from "react-device-detect";
import { Trans, useTranslation } from "react-i18next";
import {
  LuFolderCheck,
  LuImagePlus,
  LuPencil,
  LuRefreshCw,
  LuScanFace,
  LuTrash2,
} from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";
import {
  ClassificationCard,
  GroupedClassificationCard,
} from "@/components/card/ClassificationCard";
import {
  ClassificationItemData,
  ClassifiedEvent,
} from "@/types/classification";

export default function FaceLibrary() {
  const { t } = useTranslation(["views/faceLibrary"]);

  const { data: config } = useSWR<FrigateConfig>("config");

  // title

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  const [page, setPage] = useState<string>("train");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);

  // face data

  const { data: faceData, mutate: refreshFaces } =
    useSWR<FaceLibraryData>("faces");

  const faces = useMemo<string[]>(
    () =>
      faceData
        ? Object.keys(faceData)
            .filter((face) => face != "train")
            .sort()
        : [],
    [faceData],
  );
  const faceImages = useMemo<string[]>(
    () => (pageToggle && faceData ? faceData[pageToggle] : []),
    [pageToggle, faceData],
  );

  const trainImages = useMemo<string[]>(
    () => faceData?.["train"] || [],
    [faceData],
  );

  // upload

  const [upload, setUpload] = useState(false);
  const [addFace, setAddFace] = useState(false);

  // input focus for keyboard shortcuts
  const onUploadImage = useCallback(
    (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      axios
        .post(`faces/${pageToggle}/register`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((resp) => {
          if (resp.status == 200) {
            setUpload(false);
            refreshFaces();
            toast.success(t("toast.success.uploadedImage"), {
              position: "top-center",
            });
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(t("toast.error.uploadingImageFailed", { errorMessage }), {
            position: "top-center",
          });
        });
    },
    [pageToggle, refreshFaces, t],
  );

  // face multiselect

  const [selectedFaces, setSelectedFaces] = useState<string[]>([]);

  const onClickFaces = useCallback(
    (images: string[], ctrl: boolean) => {
      if (selectedFaces.length == 0 && !ctrl) {
        return;
      }

      let newSelectedFaces = [...selectedFaces];

      images.forEach((imageId) => {
        const index = newSelectedFaces.indexOf(imageId);

        if (index != -1) {
          if (selectedFaces.length == 1) {
            newSelectedFaces = [];
          } else {
            const copy = [
              ...newSelectedFaces.slice(0, index),
              ...newSelectedFaces.slice(index + 1),
            ];
            newSelectedFaces = copy;
          }
        } else {
          newSelectedFaces.push(imageId);
        }
      });

      setSelectedFaces(newSelectedFaces);
    },
    [selectedFaces, setSelectedFaces],
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState<{
    name: string;
    ids: string[];
  } | null>(null);

  const onDelete = useCallback(
    (name: string, ids: string[], isName: boolean = false) => {
      axios
        .post(`/faces/${name}/delete`, { ids })
        .then((resp) => {
          setSelectedFaces([]);

          if (resp.status == 200) {
            if (isName) {
              toast.success(
                t("toast.success.deletedName", { count: ids.length }),
                {
                  position: "top-center",
                },
              );
            } else {
              toast.success(
                t("toast.success.deletedFace", { count: ids.length }),
                {
                  position: "top-center",
                },
              );
            }

            if (faceImages.length == 1) {
              // face has been deleted
              setPageToggle("train");
            }

            refreshFaces();
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          if (isName) {
            toast.error(t("toast.error.deleteNameFailed", { errorMessage }), {
              position: "top-center",
            });
          } else {
            toast.error(t("toast.error.deleteFaceFailed", { errorMessage }), {
              position: "top-center",
            });
          }
        });
    },
    [faceImages, refreshFaces, setPageToggle, t],
  );

  const onRename = useCallback(
    (oldName: string, newName: string) => {
      axios
        .put(`/faces/${oldName}/rename`, { new_name: newName })
        .then((resp) => {
          if (resp.status === 200) {
            toast.success(t("toast.success.renamedFace", { name: newName }), {
              position: "top-center",
            });
            setPageToggle("train");
            refreshFaces();
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(t("toast.error.renameFaceFailed", { errorMessage }), {
            position: "top-center",
          });
        });
    },
    [setPageToggle, refreshFaces, t],
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
            if (selectedFaces.length) {
              setSelectedFaces([]);
            } else {
              setSelectedFaces([
                ...(pageToggle === "train" ? trainImages : faceImages),
              ]);
            }

            return true;
          }
          break;
        case "Escape":
          setSelectedFaces([]);
          return true;
      }

      return false;
    },
    contentRef,
  );

  useEffect(() => {
    setSelectedFaces([]);
  }, [pageToggle]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster />

      <AlertDialog
        open={!!deleteDialogOpen}
        onOpenChange={() => setDeleteDialogOpen(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteFaceAttempts.title")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <Trans
              ns="views/faceLibrary"
              values={{ count: deleteDialogOpen?.ids.length }}
            >
              deleteFaceAttempts.desc
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
                  onDelete(deleteDialogOpen.name, deleteDialogOpen.ids);
                  setDeleteDialogOpen(null);
                }
              }}
            >
              {t("button.delete", { ns: "common" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UploadImageDialog
        open={upload}
        title={t("uploadFaceImage.title")}
        description={t("uploadFaceImage.desc", { pageToggle })}
        setOpen={setUpload}
        onSave={onUploadImage}
      />

      <CreateFaceWizardDialog
        open={addFace}
        setOpen={setAddFace}
        onFinish={refreshFaces}
      />

      <div className="relative mb-2 flex h-11 w-full items-center justify-between">
        <LibrarySelector
          pageToggle={pageToggle}
          faceData={faceData}
          faces={faces}
          trainImages={trainImages}
          setPageToggle={setPageToggle}
          onDelete={onDelete}
          onRename={onRename}
        />
        {selectedFaces?.length > 0 ? (
          <div className="flex items-center justify-center gap-2">
            <div className="mx-1 flex w-auto items-center justify-center text-sm text-muted-foreground">
              <div className="p-1">
                {t("selected", {
                  ns: "views/events",
                  count: selectedFaces.length,
                })}
              </div>
              <div className="p-1">{"|"}</div>
              <div
                className="cursor-pointer p-2 text-primary hover:rounded-lg hover:bg-secondary"
                onClick={() => setSelectedFaces([])}
              >
                {t("button.unselect", { ns: "common" })}
              </div>
              {selectedFaces.length <
                (pageToggle === "train"
                  ? trainImages.length
                  : faceImages.length) && (
                <>
                  <div className="p-1">{"|"}</div>
                  <div
                    className="cursor-pointer p-2 text-primary hover:rounded-lg hover:bg-secondary"
                    onClick={() =>
                      setSelectedFaces([
                        ...(pageToggle === "train" ? trainImages : faceImages),
                      ])
                    }
                  >
                    {t("select_all", { ns: "views/events" })}
                  </div>
                </>
              )}
            </div>
            <Button
              className="flex gap-2"
              onClick={() =>
                setDeleteDialogOpen({ name: pageToggle, ids: selectedFaces })
              }
            >
              <LuTrash2 className="size-7 rounded-md p-1 text-secondary-foreground" />
              {isDesktop && t("button.deleteFaceAttempts")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Button className="flex gap-2" onClick={() => setAddFace(true)}>
              <LuScanFace className="size-7 rounded-md p-1 text-secondary-foreground" />
              {isDesktop && t("button.addFace")}
            </Button>
            {pageToggle != "train" && (
              <Button className="flex gap-2" onClick={() => setUpload(true)}>
                <LuImagePlus className="size-7 rounded-md p-1 text-secondary-foreground" />
                {isDesktop && t("button.uploadImage")}
              </Button>
            )}
          </div>
        )}
      </div>
      {pageToggle && faceImages?.length === 0 && pageToggle !== "train" ? (
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
          <LuFolderCheck className="size-16" />
          {t("nofaces")}
        </div>
      ) : (
        pageToggle &&
        (pageToggle == "train" ? (
          <TrainingGrid
            config={config}
            contentRef={contentRef}
            attemptImages={trainImages}
            faceNames={faces}
            selectedFaces={selectedFaces}
            onClickFaces={onClickFaces}
            onRefresh={refreshFaces}
          />
        ) : (
          <FaceGrid
            contentRef={contentRef}
            faceImages={faceImages}
            pageToggle={pageToggle}
            selectedFaces={selectedFaces}
            onClickFaces={onClickFaces}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  );
}

type LibrarySelectorProps = {
  pageToggle: string | undefined;
  faceData?: FaceLibraryData;
  faces: string[];
  trainImages: string[];
  setPageToggle: (toggle: string) => void;
  onDelete: (name: string, ids: string[], isName: boolean) => void;
  onRename: (old_name: string, new_name: string) => void;
};
function LibrarySelector({
  pageToggle,
  faceData,
  faces,
  trainImages,
  setPageToggle,
  onDelete,
  onRename,
}: LibrarySelectorProps) {
  const { t } = useTranslation(["views/faceLibrary"]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renameFace, setRenameFace] = useState<string | null>(null);

  const handleDeleteFace = useCallback(
    (faceName: string) => {
      // Get all image IDs for this face
      const imageIds = faceData?.[faceName] || [];

      onDelete(faceName, imageIds, true);
      setPageToggle("train");
    },
    [faceData, onDelete, setPageToggle],
  );

  const handleSetOpen = useCallback(
    (open: boolean) => {
      setRenameFace(open ? renameFace : null);
    },
    [renameFace],
  );

  const pageTitle = useMemo(() => {
    if (pageToggle != "train") {
      return pageToggle;
    }

    if (isMobileOnly) {
      return t("train.titleShort");
    }

    return t("train.title");
  }, [pageToggle, t]);

  return (
    <>
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteFaceLibrary.title")}</DialogTitle>
            <DialogDescription>
              {t("deleteFaceLibrary.desc", { name: confirmDelete })}
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
        open={!!renameFace}
        setOpen={handleSetOpen}
        title={t("renameFace.title")}
        description={t("renameFace.desc", { name: renameFace })}
        onSave={(newName) => {
          onRename(renameFace!, newName);
          setRenameFace(null);
        }}
        defaultValue={renameFace || ""}
        regexPattern={/^[\p{L}\p{N}\s'_-]{1,50}$/u}
        regexErrorMessage={t("description.invalidName")}
      />

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button className="flex justify-between smart-capitalize">
            {pageTitle}
            <span className="ml-2 text-primary-variant">
              ({(pageToggle && faceData?.[pageToggle]?.length) || 0})
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
          {trainImages.length > 0 && faces.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="mb-1 ml-1.5 text-xs text-secondary-foreground">
                {t("collections")}
              </div>
            </>
          )}
          {Object.values(faces).map((face) => (
            <DropdownMenuItem
              key={face}
              className="group flex items-center justify-between"
            >
              <div
                className="flex-grow cursor-pointer"
                onClick={() => setPageToggle(face)}
              >
                {face}
                <span className="ml-2 text-muted-foreground">
                  ({faceData?.[face].length})
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
                        setRenameFace(face);
                      }}
                    >
                      <LuPencil className="size-4 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent>{t("button.renameFace")}</TooltipContent>
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
                        setConfirmDelete(face);
                      }}
                    >
                      <LuTrash2 className="size-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent>{t("button.deleteFace")}</TooltipContent>
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

type TrainingGridProps = {
  config: FrigateConfig;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  attemptImages: string[];
  faceNames: string[];
  selectedFaces: string[];
  onClickFaces: (images: string[], ctrl: boolean) => void;
  onRefresh: (
    data?:
      | FaceLibraryData
      | Promise<FaceLibraryData>
      | ((
          currentData: FaceLibraryData | undefined,
        ) => FaceLibraryData | undefined),
    opts?: boolean | { revalidate?: boolean },
  ) => Promise<FaceLibraryData | undefined>;
};
function TrainingGrid({
  config,
  contentRef,
  attemptImages,
  faceNames,
  selectedFaces,
  onClickFaces,
  onRefresh,
}: TrainingGridProps) {
  const { t } = useTranslation(["views/faceLibrary"]);

  // face data

  const faceGroups = useMemo(() => {
    const groups: { [eventId: string]: ClassificationItemData[] } = {};

    const faces = attemptImages
      .map((image) => {
        const parts = image.split("-");

        try {
          return {
            filename: image,
            filepath: `clips/faces/train/${image}`,
            timestamp: Number.parseFloat(parts[2]),
            eventId: `${parts[0]}-${parts[1]}`,
            name: parts[3],
            score: Number.parseFloat(parts[4]),
          };
        } catch {
          return null;
        }
      })
      .filter((v) => v != null);

    faces
      .sort((a, b) => a.eventId.localeCompare(b.eventId))
      .reverse()
      .forEach((face) => {
        if (groups[face.eventId]) {
          groups[face.eventId].push(face);
        } else {
          groups[face.eventId] = [face];
        }
      });

    return groups;
  }, [attemptImages]);

  const eventIdsQuery = useMemo(
    () => Object.keys(faceGroups).join(","),
    [faceGroups],
  );

  const { data: events } = useSWR<Event[]>([
    "event_ids",
    { ids: eventIdsQuery },
  ]);

  if (attemptImages.length == 0) {
    return (
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
        <LuFolderCheck className="size-16" />
        {t("train.empty")}
      </div>
    );
  }

  return (
    <div
      ref={contentRef}
      className={cn(
        "scrollbar-container grid grid-cols-2 gap-3 overflow-y-scroll p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 3xl:grid-cols-12",
      )}
    >
      {Object.entries(faceGroups).map(([key, group]) => {
        const event = events?.find((ev) => ev.id == key);
        return (
          <div key={key} className="aspect-square w-full">
            <FaceAttemptGroup
              config={config}
              group={group}
              event={event}
              faceNames={faceNames}
              selectedFaces={selectedFaces}
              onClickFaces={onClickFaces}
              onRefresh={onRefresh}
            />
          </div>
        );
      })}
    </div>
  );
}

type FaceAttemptGroupProps = {
  config: FrigateConfig;
  group: ClassificationItemData[];
  event?: Event;
  faceNames: string[];
  selectedFaces: string[];
  onClickFaces: (image: string[], ctrl: boolean) => void;
  onRefresh: (
    data?:
      | FaceLibraryData
      | Promise<FaceLibraryData>
      | ((
          currentData: FaceLibraryData | undefined,
        ) => FaceLibraryData | undefined),
    opts?: boolean | { revalidate?: boolean },
  ) => Promise<FaceLibraryData | undefined>;
};
function FaceAttemptGroup({
  config,
  group,
  event,
  faceNames,
  selectedFaces,
  onClickFaces,
  onRefresh,
}: FaceAttemptGroupProps) {
  const { t } = useTranslation(["views/faceLibrary", "views/explore"]);

  // data

  const threshold = useMemo(() => {
    return {
      recognition: config.face_recognition.recognition_threshold,
      unknown: config.face_recognition.unknown_score,
    };
  }, [config]);

  // interaction

  const handleClickEvent = useCallback(
    (meta: boolean) => {
      if (!meta) {
        return;
      } else {
        const anySelected =
          group.find((face) => selectedFaces.includes(face.filename)) !=
          undefined;

        if (anySelected) {
          // deselect all
          const toDeselect: string[] = [];
          group.forEach((face) => {
            if (selectedFaces.includes(face.filename)) {
              toDeselect.push(face.filename);
            }
          });
          onClickFaces(toDeselect, false);
        } else {
          // select all
          onClickFaces(
            group.map((face) => face.filename),
            true,
          );
        }
      }
    },
    [group, selectedFaces, onClickFaces],
  );

  // api calls

  const onTrainAttempt = useCallback(
    (data: ClassificationItemData, trainName: string) => {
      axios
        .post(`/faces/train/${trainName}/classify`, {
          training_file: data.filename,
        })
        .then((resp) => {
          if (resp.status == 200) {
            toast.success(t("toast.success.trainedFace"), {
              position: "top-center",
              closeButton: true,
            });
            onRefresh();
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(t("toast.error.trainFailed", { errorMessage }), {
            position: "top-center",
          });
        });
    },
    [onRefresh, t],
  );

  const onReprocess = useCallback(
    (data: ClassificationItemData) => {
      axios
        .post(`/faces/reprocess`, { training_file: data.filename })
        .then((resp) => {
          if (resp.status == 200 && resp.data?.success) {
            const { face_name, score } = resp.data;
            const oldFilename = data.filename;
            const parts = oldFilename.split("-");
            const newFilename = `${parts[0]}-${parts[1]}-${parts[2]}-${face_name}-${score}.webp`;

            onRefresh(
              (currentData: FaceLibraryData | undefined) => {
                if (!currentData?.train) return currentData;

                return {
                  ...currentData,
                  train: currentData.train.map((filename: string) =>
                    filename === oldFilename ? newFilename : filename,
                  ),
                };
              },
              { revalidate: true },
            );

            toast.success(
              t("toast.success.updatedFaceScore", {
                name: face_name,
                score: score.toFixed(2),
              }),
              {
                position: "top-center",
              },
            );
          } else if (resp.data?.success === false) {
            // Handle case where API returns success: false
            const errorMessage = resp.data?.message || "Unknown error";
            toast.error(
              t("toast.error.updateFaceScoreFailed", { errorMessage }),
              {
                position: "top-center",
              },
            );
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("toast.error.updateFaceScoreFailed", { errorMessage }),
            {
              position: "top-center",
            },
          );
        });
    },
    [onRefresh, t],
  );

  // Create ClassifiedEvent from Event (face recognition uses sub_label)
  const classifiedEvent: ClassifiedEvent | undefined = useMemo(() => {
    if (!event || !event.sub_label || event.sub_label === "none") {
      return undefined;
    }
    return {
      id: event.id,
      label: event.sub_label,
      score: event.data?.sub_label_score,
    };
  }, [event]);

  return (
    <GroupedClassificationCard
      group={group}
      classifiedEvent={classifiedEvent}
      threshold={threshold}
      selectedItems={selectedFaces}
      i18nLibrary="views/faceLibrary"
      objectType="person"
      noClassificationLabel="details.unknown"
      onClick={(data) => {
        if (data) {
          onClickFaces([data.filename], true);
        } else {
          handleClickEvent(true);
        }
      }}
    >
      {(data) => (
        <>
          <FaceSelectionDialog
            faceNames={faceNames}
            onTrainAttempt={(name) => onTrainAttempt(data, name)}
          >
            <BlurredIconButton>
              <AddFaceIcon className="size-5" />
            </BlurredIconButton>
          </FaceSelectionDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <BlurredIconButton onClick={() => onReprocess(data)}>
                <LuRefreshCw className="size-5" />
              </BlurredIconButton>
            </TooltipTrigger>
            <TooltipContent>{t("button.reprocessFace")}</TooltipContent>
          </Tooltip>
        </>
      )}
    </GroupedClassificationCard>
  );
}

type FaceGridProps = {
  contentRef: MutableRefObject<HTMLDivElement | null>;
  faceImages: string[];
  pageToggle: string;
  selectedFaces: string[];
  onClickFaces: (images: string[], ctrl: boolean) => void;
  onDelete: (name: string, ids: string[]) => void;
};
function FaceGrid({
  contentRef,
  faceImages,
  pageToggle,
  selectedFaces,
  onClickFaces,
  onDelete,
}: FaceGridProps) {
  const { t } = useTranslation(["views/faceLibrary"]);

  const sortedFaces = useMemo(
    () => (faceImages || []).sort().reverse(),
    [faceImages],
  );

  if (sortedFaces.length === 0) {
    return (
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
        <LuFolderCheck className="size-16" />
        {t("nofaces")}
      </div>
    );
  }

  return (
    <div
      ref={contentRef}
      className={cn(
        "scrollbar-container grid grid-cols-2 gap-2 overflow-y-scroll p-1 md:grid-cols-4 xl:grid-cols-8 2xl:grid-cols-10 3xl:grid-cols-12",
      )}
    >
      {sortedFaces.map((image: string) => (
        <div key={image} className="aspect-square w-full">
          <ClassificationCard
            data={{
              name: pageToggle,
              filename: image,
              filepath: `clips/faces/${pageToggle}/${image}`,
            }}
            selected={selectedFaces.includes(image)}
            clickable={selectedFaces.length > 0}
            i18nLibrary="views/faceLibrary"
            onClick={(data, meta) => onClickFaces([data.filename], meta)}
          >
            <Tooltip>
              <TooltipTrigger>
                <LuTrash2
                  className="size-5 cursor-pointer text-gray-200 hover:text-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(pageToggle, [image]);
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>{t("button.deleteFaceAttempts")}</TooltipContent>
            </Tooltip>
          </ClassificationCard>
        </div>
      ))}
    </div>
  );
}
