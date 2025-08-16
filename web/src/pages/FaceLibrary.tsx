import { baseUrl } from "@/api/baseUrl";
import TimeAgo from "@/components/dynamic/TimeAgo";
import AddFaceIcon from "@/components/icons/AddFaceIcon";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import CreateFaceWizardDialog from "@/components/overlay/detail/FaceCreateWizardDialog";
import TextEntryDialog from "@/components/overlay/dialog/TextEntryDialog";
import UploadImageDialog from "@/components/overlay/dialog/UploadImageDialog";
import FaceSelectionDialog from "@/components/overlay/FaceSelectionDialog";
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
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useContextMenu from "@/hooks/use-contextmenu";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import useOptimisticState from "@/hooks/use-optimistic-state";
import { cn } from "@/lib/utils";
import { Event } from "@/types/event";
import { FaceLibraryData, RecognizedFaceData } from "@/types/face";
import { FaceRecognitionConfig, FrigateConfig } from "@/types/frigateConfig";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { Trans, useTranslation } from "react-i18next";
import {
  LuFolderCheck,
  LuImagePlus,
  LuPencil,
  LuRefreshCw,
  LuScanFace,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useSWR from "swr";
import SearchDetailDialog, {
  SearchTab,
} from "@/components/overlay/detail/SearchDetailDialog";
import { SearchResult } from "@/types/search";

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

  useKeyboardListener(["a", "Escape"], (key, modifiers) => {
    if (modifiers.repeat || !modifiers.down) {
      return;
    }

    switch (key) {
      case "a":
        if (modifiers.ctrl) {
          if (selectedFaces.length) {
            setSelectedFaces([]);
          } else {
            setSelectedFaces([
              ...(pageToggle === "train" ? trainImages : faceImages),
            ]);
          }
        }
        break;
      case "Escape":
        setSelectedFaces([]);
        break;
    }
  });

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
            <div className="mx-1 flex w-48 items-center justify-center text-sm text-muted-foreground">
              <div className="p-1">{`${selectedFaces.length} selected`}</div>
              <div className="p-1">{"|"}</div>
              <div
                className="cursor-pointer p-2 text-primary hover:rounded-lg hover:bg-secondary"
                onClick={() => setSelectedFaces([])}
              >
                {t("button.unselect", { ns: "common" })}
              </div>
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
            attemptImages={trainImages}
            faceNames={faces}
            selectedFaces={selectedFaces}
            onClickFaces={onClickFaces}
            onRefresh={refreshFaces}
          />
        ) : (
          <FaceGrid
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex justify-between smart-capitalize">
            {pageToggle == "train" ? t("train.title") : pageToggle}
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
  attemptImages: string[];
  faceNames: string[];
  selectedFaces: string[];
  onClickFaces: (images: string[], ctrl: boolean) => void;
  onRefresh: () => void;
};
function TrainingGrid({
  config,
  attemptImages,
  faceNames,
  selectedFaces,
  onClickFaces,
  onRefresh,
}: TrainingGridProps) {
  const { t } = useTranslation(["views/faceLibrary"]);

  // face data

  const faceGroups = useMemo(() => {
    const groups: { [eventId: string]: RecognizedFaceData[] } = {};

    const faces = attemptImages
      .map((image) => {
        const parts = image.split("-");

        try {
          return {
            filename: image,
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

  // selection

  const [selectedEvent, setSelectedEvent] = useState<Event>();
  const [dialogTab, setDialogTab] = useState<SearchTab>("details");

  if (attemptImages.length == 0) {
    return (
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
        <LuFolderCheck className="size-16" />
        {t("train.empty")}
      </div>
    );
  }

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

      <div className="scrollbar-container flex flex-wrap gap-2 overflow-y-scroll p-1">
        {Object.entries(faceGroups).map(([key, group]) => {
          const event = events?.find((ev) => ev.id == key);
          return (
            <FaceAttemptGroup
              key={key}
              config={config}
              group={group}
              event={event}
              faceNames={faceNames}
              selectedFaces={selectedFaces}
              onClickFaces={onClickFaces}
              onSelectEvent={setSelectedEvent}
              onRefresh={onRefresh}
            />
          );
        })}
      </div>
    </>
  );
}

type FaceAttemptGroupProps = {
  config: FrigateConfig;
  group: RecognizedFaceData[];
  event?: Event;
  faceNames: string[];
  selectedFaces: string[];
  onClickFaces: (image: string[], ctrl: boolean) => void;
  onSelectEvent: (event: Event) => void;
  onRefresh: () => void;
};
function FaceAttemptGroup({
  config,
  group,
  event,
  faceNames,
  selectedFaces,
  onClickFaces,
  onSelectEvent,
  onRefresh,
}: FaceAttemptGroupProps) {
  const navigate = useNavigate();
  const { t } = useTranslation(["views/faceLibrary", "views/explore"]);

  // data

  const allFacesSelected = useMemo(
    () => group.every((face) => selectedFaces.includes(face.filename)),
    [group, selectedFaces],
  );

  // interaction

  const handleClickEvent = useCallback(
    (meta: boolean) => {
      if (event && selectedFaces.length == 0 && !meta) {
        onSelectEvent(event);
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
    [event, group, selectedFaces, onClickFaces, onSelectEvent],
  );

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-lg bg-card p-2 outline outline-[3px]",
        isMobile && "w-full",
        allFacesSelected
          ? "shadow-selected outline-selected"
          : "outline-transparent duration-500",
      )}
      onClick={() => {
        if (selectedFaces.length) {
          handleClickEvent(true);
        }
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.preventDefault();
        handleClickEvent(true);
      }}
    >
      <div className="flex flex-row justify-between">
        <div className="flex flex-col gap-1">
          <div className="select-none smart-capitalize">
            {t("details.person")}
            {event?.sub_label
              ? `: ${event.sub_label} (${Math.round((event.data.sub_label_score || 0) * 100)}%)`
              : ": " + t("details.unknown")}
          </div>
          <TimeAgo
            className="text-sm text-secondary-foreground"
            time={group[0].timestamp * 1000}
            dense
          />
        </div>
        {event && (
          <Tooltip>
            <TooltipTrigger>
              <div
                className="cursor-pointer"
                onClick={() => {
                  navigate(`/explore?event_id=${event.id}`);
                }}
              >
                <LuSearch className="size-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent>
                {t("details.item.button.viewInExplore", {
                  ns: "views/explore",
                })}
              </TooltipContent>
            </TooltipPortal>
          </Tooltip>
        )}
      </div>

      <div
        className={cn(
          "gap-2",
          isDesktop
            ? "flex flex-row flex-wrap"
            : "grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-6",
        )}
      >
        {group.map((data: RecognizedFaceData) => (
          <FaceAttempt
            key={data.filename}
            data={data}
            faceNames={faceNames}
            recognitionConfig={config.face_recognition}
            selected={
              allFacesSelected ? false : selectedFaces.includes(data.filename)
            }
            onClick={(data, meta) => {
              if (meta || selectedFaces.length > 0) {
                onClickFaces([data.filename], true);
              } else if (event) {
                onSelectEvent(event);
              }
            }}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}

type FaceAttemptProps = {
  data: RecognizedFaceData;
  faceNames: string[];
  recognitionConfig: FaceRecognitionConfig;
  selected: boolean;
  onClick: (data: RecognizedFaceData, meta: boolean) => void;
  onRefresh: () => void;
};
function FaceAttempt({
  data,
  faceNames,
  recognitionConfig,
  selected,
  onClick,
  onRefresh,
}: FaceAttemptProps) {
  const { t } = useTranslation(["views/faceLibrary"]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const scoreStatus = useMemo(() => {
    if (data.score >= recognitionConfig.recognition_threshold) {
      return "match";
    } else if (data.score >= recognitionConfig.unknown_score) {
      return "potential";
    } else {
      return "unknown";
    }
  }, [data, recognitionConfig]);

  // interaction

  const imgRef = useRef<HTMLImageElement | null>(null);

  useContextMenu(imgRef, () => {
    onClick(data, true);
  });

  const imageArea = useMemo(() => {
    if (imgRef.current == null || !imageLoaded) {
      return undefined;
    }

    return imgRef.current.naturalWidth * imgRef.current.naturalHeight;
  }, [imageLoaded]);

  // api calls

  const onTrainAttempt = useCallback(
    (trainName: string) => {
      axios
        .post(`/faces/train/${trainName}/classify`, {
          training_file: data.filename,
        })
        .then((resp) => {
          if (resp.status == 200) {
            toast.success(t("toast.success.trainedFace"), {
              position: "top-center",
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
    [data, onRefresh, t],
  );

  const onReprocess = useCallback(() => {
    axios
      .post(`/faces/reprocess`, { training_file: data.filename })
      .then((resp) => {
        if (resp.status == 200) {
          toast.success(t("toast.success.updatedFaceScore"), {
            position: "top-center",
          });
          onRefresh();
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(t("toast.error.updateFaceScoreFailed", { errorMessage }), {
          position: "top-center",
        });
      });
  }, [data, onRefresh, t]);

  return (
    <>
      <div
        className={cn(
          "relative flex cursor-pointer flex-col rounded-lg outline outline-[3px]",
          selected
            ? "shadow-selected outline-selected"
            : "outline-transparent duration-500",
        )}
      >
        <div className="relative w-full select-none overflow-hidden rounded-lg">
          <img
            ref={imgRef}
            onLoad={() => setImageLoaded(true)}
            className={cn("size-44", isMobile && "w-full")}
            src={`${baseUrl}clips/faces/train/${data.filename}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick(data, e.metaKey || e.ctrlKey);
            }}
          />
          {imageArea != undefined && (
            <div className="absolute bottom-1 right-1 z-10 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
              {t("pixels", { area: imageArea })}
            </div>
          )}
        </div>
        <div className="select-none p-2">
          <div className="flex w-full flex-row items-center justify-between gap-2">
            <div className="flex flex-col items-start text-xs text-primary-variant">
              <div className="smart-capitalize">
                {data.name == "unknown" ? t("details.unknown") : data.name}
              </div>
              <div
                className={cn(
                  "",
                  scoreStatus == "match" && "text-success",
                  scoreStatus == "potential" && "text-orange-400",
                  scoreStatus == "unknown" && "text-danger",
                )}
              >
                {Math.round(data.score * 100)}%
              </div>
            </div>
            <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
              <FaceSelectionDialog
                faceNames={faceNames}
                onTrainAttempt={onTrainAttempt}
              >
                <AddFaceIcon className="size-5 cursor-pointer text-primary-variant hover:text-primary" />
              </FaceSelectionDialog>
              <Tooltip>
                <TooltipTrigger>
                  <LuRefreshCw
                    className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                    onClick={() => onReprocess()}
                  />
                </TooltipTrigger>
                <TooltipContent>{t("button.reprocessFace")}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type FaceGridProps = {
  faceImages: string[];
  pageToggle: string;
  selectedFaces: string[];
  onClickFaces: (images: string[], ctrl: boolean) => void;
  onDelete: (name: string, ids: string[]) => void;
};
function FaceGrid({
  faceImages,
  pageToggle,
  selectedFaces,
  onClickFaces,
  onDelete,
}: FaceGridProps) {
  const sortedFaces = useMemo(
    () => (faceImages || []).sort().reverse(),
    [faceImages],
  );

  if (sortedFaces.length === 0) {
    return (
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
        <LuFolderCheck className="size-16" />
        (t("nofaces"))
      </div>
    );
  }

  return (
    <div
      className={cn(
        "scrollbar-container gap-2 overflow-y-scroll p-1",
        isDesktop ? "flex flex-wrap" : "grid grid-cols-2 md:grid-cols-4",
      )}
    >
      {sortedFaces.map((image: string) => (
        <FaceImage
          key={image}
          name={pageToggle}
          image={image}
          selected={selectedFaces.includes(image)}
          onClickFaces={onClickFaces}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

type FaceImageProps = {
  name: string;
  image: string;
  selected: boolean;
  onClickFaces: (images: string[], ctrl: boolean) => void;
  onDelete: (name: string, ids: string[]) => void;
};
function FaceImage({
  name,
  image,
  selected,
  onClickFaces,
  onDelete,
}: FaceImageProps) {
  const { t } = useTranslation(["views/faceLibrary"]);

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col gap-2 rounded-lg bg-card outline outline-[3px]",
        selected
          ? "shadow-selected outline-selected"
          : "outline-transparent duration-500",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClickFaces([image], e.ctrlKey || e.metaKey);
      }}
    >
      <div
        className={cn(
          "w-full overflow-hidden p-2 *:text-card-foreground",
          isMobile && "flex justify-center",
        )}
      >
        <img
          className="h-40 rounded-lg"
          src={`${baseUrl}clips/faces/${name}/${image}`}
        />
      </div>
      <div className="rounded-b-lg bg-card p-3">
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <div className="flex flex-col items-start text-xs text-primary-variant">
            <div className="smart-capitalize">{name}</div>
          </div>
          <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
            <Tooltip>
              <TooltipTrigger>
                <LuTrash2
                  className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(name, [image]);
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>{t("button.deleteFaceAttempts")}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
