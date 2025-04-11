import { baseUrl } from "@/api/baseUrl";
import TimeAgo from "@/components/dynamic/TimeAgo";
import AddFaceIcon from "@/components/icons/AddFaceIcon";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import CreateFaceWizardDialog from "@/components/overlay/detail/FaceCreateWizardDialog";
import UploadImageDialog from "@/components/overlay/dialog/UploadImageDialog";
import FaceSelectionDialog from "@/components/overlay/FaceSelectionDialog";
import { Button } from "@/components/ui/button";
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
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
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
import { useTranslation } from "react-i18next";
import {
  LuImagePlus,
  LuRefreshCw,
  LuScanFace,
  LuSearch,
  LuTrash2,
} from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useSWR from "swr";

export default function FaceLibrary() {
  const { t } = useTranslation(["views/faceLibrary"]);

  const { data: config } = useSWR<FrigateConfig>("config");

  // title

  useEffect(() => {
    document.title = t("documentTitle");
  }, [t]);

  const [page, setPage] = useState<string>();
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);

  // face data

  const { data: faceData, mutate: refreshFaces } =
    useSWR<FaceLibraryData>("faces");

  const faces = useMemo<string[]>(
    () =>
      faceData ? Object.keys(faceData).filter((face) => face != "train") : [],
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

  useEffect(() => {
    if (!pageToggle) {
      if (trainImages.length > 0) {
        setPageToggle("train");
      } else if (faces) {
        setPageToggle(faces[0]);
      }
    } else if (pageToggle == "train" && trainImages.length == 0) {
      setPageToggle(faces[0]);
    }
    // we need to listen on the value of the faces list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainImages, faces]);

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
              setPageToggle("");
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
            setSelectedFaces([...trainImages]);
          }
        }
        break;
      case "Escape":
        setSelectedFaces([]);
        break;
    }
  });

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster />

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
              onClick={() => onDelete("train", selectedFaces)}
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
      {pageToggle &&
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
            onDelete={onDelete}
          />
        ))}
    </div>
  );
}

type LibrarySelectorProps = {
  pageToggle: string | undefined;
  faceData?: FaceLibraryData;
  faces: string[];
  trainImages: string[];
  setPageToggle: (toggle: string | undefined) => void;
  onDelete: (name: string, ids: string[], isName: boolean) => void;
};
function LibrarySelector({
  pageToggle,
  faceData,
  faces,
  trainImages,
  setPageToggle,
  onDelete,
}: LibrarySelectorProps) {
  const { t } = useTranslation(["views/faceLibrary"]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDeleteFace = useCallback(
    (faceName: string) => {
      // Get all image IDs for this face
      const imageIds = faceData?.[faceName] || [];

      onDelete(faceName, imageIds, true);
      setPageToggle("train");
    },
    [faceData, onDelete, setPageToggle],
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex justify-between capitalize">
            {pageToggle || t("selectFace")}
            <span className="ml-2 text-primary-variant">
              ({(pageToggle && faceData?.[pageToggle]?.length) || 0})
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="scrollbar-container max-h-[40dvh] min-w-[220px] overflow-y-auto"
          align="start"
        >
          {trainImages.length > 0 && (
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
          )}
          {trainImages.length > 0 && faces.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="mb-1 ml-1.5 text-xs text-secondary-foreground">
                Collections
              </div>
            </>
          )}
          {Object.values(faces).map((face) => (
            <DropdownMenuItem
              key={face}
              className="group flex items-center justify-between"
            >
              <div
                className="flex-grow cursor-pointer capitalize"
                onClick={() => setPageToggle(face)}
              >
                {face}
                <span className="ml-2 text-muted-foreground">
                  ({faceData?.[face].length})
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(face);
                }}
              >
                <LuTrash2 className="size-4 text-destructive" />
              </Button>
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

  const formattedDate = useFormattedTimestamp(
    selectedEvent?.start_time ?? 0,
    config?.ui.time_format == "24hour"
      ? t("time.formattedTimestampWithYear.24hour", { ns: "common" })
      : t("time.formattedTimestampWithYear.12hour", { ns: "common" }),
    config?.ui.timezone,
  );

  return (
    <>
      <Dialog
        open={selectedEvent != undefined}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedEvent(undefined);
          }
        }}
      >
        <DialogContent
          className={cn(
            "",
            selectedEvent?.has_snapshot && isDesktop && "max-w-7xl",
          )}
        >
          <DialogHeader>
            <DialogTitle>{t("details.face")}</DialogTitle>
            <DialogDescription>{t("details.faceDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">{t("details.person")}</div>
            <div className="text-sm capitalize">
              {selectedEvent?.sub_label ?? "Unknown"}
            </div>
          </div>
          {selectedEvent?.data.sub_label_score && (
            <div className="flex flex-col gap-1.5">
              <div className="text-sm text-primary/40">
                {t("details.confidence")}
              </div>
              <div className="text-sm capitalize">
                {Math.round(selectedEvent?.data?.sub_label_score || 0) * 100}%
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">
              {t("details.timestamp")}
            </div>
            <div className="text-sm">{formattedDate}</div>
          </div>
          <img
            className="w-full"
            src={`${baseUrl}api/events/${selectedEvent?.id}/${selectedEvent?.has_snapshot ? "snapshot.jpg" : "thumbnail.jpg"}`}
          />
        </DialogContent>
      </Dialog>

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
        <div className="select-none capitalize">
          Person
          {event?.sub_label
            ? `: ${event.sub_label} (${Math.round((event.data.sub_label_score || 0) * 100)}%)`
            : ": Unknown"}
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
        <div className="relative w-full select-none overflow-hidden rounded-lg *:text-card-foreground">
          <img
            ref={imgRef}
            className={cn("size-44", isMobile && "w-full")}
            src={`${baseUrl}clips/faces/train/${data.filename}`}
            onClick={(e) => {
              e.stopPropagation();
              onClick(data, e.metaKey || e.ctrlKey);
            }}
          />
          <div className="absolute bottom-1 right-1 z-10 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
            <TimeAgo
              className="text-white"
              time={data.timestamp * 1000}
              dense
            />
          </div>
        </div>
        <div className="select-none p-2">
          <div className="flex w-full flex-row items-center justify-between gap-2">
            <div className="flex flex-col items-start text-xs text-primary-variant">
              <div className="capitalize">{data.name}</div>
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
  onDelete: (name: string, ids: string[]) => void;
};
function FaceGrid({ faceImages, pageToggle, onDelete }: FaceGridProps) {
  const sortedFaces = useMemo(() => faceImages.sort().reverse(), [faceImages]);

  return (
    <div
      className={cn(
        "scrollbar-container gap-2 overflow-y-scroll",
        isDesktop ? "flex flex-wrap" : "grid grid-cols-2",
      )}
    >
      {sortedFaces.map((image: string) => (
        <FaceImage
          key={image}
          name={pageToggle}
          image={image}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

type FaceImageProps = {
  name: string;
  image: string;
  onDelete: (name: string, ids: string[]) => void;
};
function FaceImage({ name, image, onDelete }: FaceImageProps) {
  const { t } = useTranslation(["views/faceLibrary"]);

  return (
    <div className="relative flex flex-col rounded-lg">
      <div
        className={cn(
          "w-full overflow-hidden rounded-t-lg *:text-card-foreground",
          isMobile && "flex justify-center",
        )}
      >
        <img className="h-40" src={`${baseUrl}clips/faces/${name}/${image}`} />
      </div>
      <div className="rounded-b-lg bg-card p-2">
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <div className="flex flex-col items-start text-xs text-primary-variant">
            <div className="capitalize">{name}</div>
          </div>
          <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
            <Tooltip>
              <TooltipTrigger>
                <LuTrash2
                  className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                  onClick={() => onDelete(name, [image])}
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
