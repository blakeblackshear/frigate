import { baseUrl } from "@/api/baseUrl";
import TimeAgo from "@/components/dynamic/TimeAgo";
import AddFaceIcon from "@/components/icons/AddFaceIcon";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import CreateFaceWizardDialog from "@/components/overlay/detail/FaceCreateWizardDialog";
import UploadImageDialog from "@/components/overlay/dialog/UploadImageDialog";
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
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { FaceLibraryData, RecognizedFaceData } from "@/types/face";
import { FaceRecognitionConfig, FrigateConfig } from "@/types/frigateConfig";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDesktop, isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { LuImagePlus, LuRefreshCw, LuScanFace, LuTrash2 } from "react-icons/lu";
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

  const onClickFace = useCallback(
    (imageId: string, ctrl: boolean) => {
      if (selectedFaces.length == 0 && !ctrl) {
        return;
      }

      const index = selectedFaces.indexOf(imageId);

      if (index != -1) {
        if (selectedFaces.length == 1) {
          setSelectedFaces([]);
        } else {
          const copy = [
            ...selectedFaces.slice(0, index),
            ...selectedFaces.slice(index + 1),
          ];
          setSelectedFaces(copy);
        }
      } else {
        const copy = [...selectedFaces];
        copy.push(imageId);
        setSelectedFaces(copy);
      }
    },
    [selectedFaces, setSelectedFaces],
  );

  const onDelete = useCallback(
    (name: string, ids: string[]) => {
      axios
        .post(`/faces/${name}/delete`, { ids })
        .then((resp) => {
          setSelectedFaces([]);

          if (resp.status == 200) {
            toast.success(t("toast.success.deletedFace"), {
              position: "top-center",
            });

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
          toast.error(t("toast.error.deleteFaceFailed", { errorMessage }), {
            position: "top-center",
          });
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
          setSelectedFaces([...trainImages]);
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
        />
        {selectedFaces?.length > 0 ? (
          <div className="flex items-center justify-center gap-2">
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
            onClickFace={onClickFace}
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
};
function LibrarySelector({
  pageToggle,
  faceData,
  faces,
  trainImages,
  setPageToggle,
}: LibrarySelectorProps) {
  const { t } = useTranslation(["views/faceLibrary"]);

  return isDesktop ? (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex flex-row">
        <ToggleGroup
          className="*:rounded-md *:px-3 *:py-4"
          type="single"
          size="sm"
          value={pageToggle}
          onValueChange={(value: string) => {
            if (value) {
              setPageToggle(value);
            }
          }}
        >
          {trainImages.length > 0 && (
            <>
              <ToggleGroupItem
                value="train"
                className={`flex scroll-mx-10 items-center justify-between gap-2 ${pageToggle == "train" ? "" : "*:text-muted-foreground"}`}
                data-nav-item="train"
                aria-label={t("train.aria")}
              >
                <div>{t("train.title")}</div>
              </ToggleGroupItem>
              <div>|</div>
            </>
          )}

          {Object.values(faces).map((face) => (
            <ToggleGroupItem
              key={face}
              className={`flex scroll-mx-10 items-center justify-between gap-2 ${pageToggle == face ? "" : "*:text-muted-foreground"}`}
              value={face}
              data-nav-item={face}
              aria-label={t("selectItem", { item: face })}
            >
              <div className="capitalize">
                {face} ({faceData?.[face].length})
              </div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ScrollBar orientation="horizontal" className="h-0" />
      </div>
    </ScrollArea>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="capitalize">{pageToggle}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {trainImages.length > 0 && (
          <DropdownMenuItem
            className="capitalize"
            aria-label={t("train.aria")}
            onClick={() => setPageToggle("train")}
          >
            <div>{t("train.title")}</div>
          </DropdownMenuItem>
        )}
        {Object.values(faces).map((face) => (
          <DropdownMenuItem
            className="capitalize"
            onClick={() => setPageToggle(face)}
          >
            {face} ({faceData?.[face].length})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type TrainingGridProps = {
  config: FrigateConfig;
  attemptImages: string[];
  faceNames: string[];
  selectedFaces: string[];
  onClickFace: (image: string, ctrl: boolean) => void;
  onRefresh: () => void;
};
function TrainingGrid({
  config,
  attemptImages,
  faceNames,
  selectedFaces,
  onClickFace,
  onRefresh,
}: TrainingGridProps) {
  const { t } = useTranslation(["views/faceLibrary"]);

  // face data

  const [selectedEvent, setSelectedEvent] = useState<RecognizedFaceData>();

  const formattedDate = useFormattedTimestamp(
    selectedEvent?.timestamp ?? 0,
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("details.face")}</DialogTitle>
            <DialogDescription>{t("details.faceDesc")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">{t("details.person")}</div>
            <div className="text-sm capitalize">{selectedEvent?.name}</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">
              {t("details.confidence")}
            </div>
            <div className="text-sm capitalize">
              {(selectedEvent?.score || 0) * 100}%
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-sm text-primary/40">
              {t("details.timestamp")}
            </div>
            <div className="text-sm">{formattedDate}</div>
          </div>
          <img
            className="w-full"
            src={`${baseUrl}api/events/${selectedEvent?.eventId}/thumbnail.jpg`}
          />
        </DialogContent>
      </Dialog>

      <div className="scrollbar-container flex flex-wrap gap-2 overflow-y-scroll p-1">
        {attemptImages.map((image: string) => (
          <FaceAttempt
            key={image}
            image={image}
            faceNames={faceNames}
            recognitionConfig={config.face_recognition}
            selected={selectedFaces.includes(image)}
            onClick={(data, meta) => {
              if (meta) {
                onClickFace(image, meta);
              } else {
                setSelectedEvent(data);
              }
            }}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </>
  );
}

type FaceAttemptProps = {
  image: string;
  faceNames: string[];
  recognitionConfig: FaceRecognitionConfig;
  selected: boolean;
  onClick: (data: RecognizedFaceData, meta: boolean) => void;
  onRefresh: () => void;
};
function FaceAttempt({
  image,
  faceNames,
  recognitionConfig,
  selected,
  onClick,
  onRefresh,
}: FaceAttemptProps) {
  const { t } = useTranslation(["views/faceLibrary"]);
  const data = useMemo<RecognizedFaceData>(() => {
    const parts = image.split("-");

    return {
      timestamp: Number.parseFloat(parts[0]),
      eventId: `${parts[0]}-${parts[1]}`,
      name: parts[2],
      score: Number.parseFloat(parts[3]),
    };
  }, [image]);

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
        .post(`/faces/train/${trainName}/classify`, { training_file: image })
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
    [image, onRefresh, t],
  );

  const onReprocess = useCallback(() => {
    axios
      .post(`/faces/reprocess`, { training_file: image })
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
  }, [image, onRefresh, t]);

  return (
    <div
      className={cn(
        "relative flex cursor-pointer flex-col rounded-lg outline outline-[3px]",
        selected
          ? "shadow-selected outline-selected"
          : "outline-transparent duration-500",
      )}
    >
      <div className="relative w-full overflow-hidden rounded-t-lg border border-t-0 *:text-card-foreground">
        <img
          ref={imgRef}
          className="size-44"
          src={`${baseUrl}clips/faces/train/${image}`}
          onClick={(e) => onClick(data, e.metaKey || e.ctrlKey)}
        />
        <div className="absolute bottom-1 right-1 z-10 rounded-lg bg-black/50 px-2 py-1 text-xs text-white">
          <TimeAgo className="text-white" time={data.timestamp * 1000} dense />
        </div>
      </div>
      <div className="rounded-b-lg bg-card p-2">
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
            <Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <TooltipTrigger>
                    <AddFaceIcon className="size-5 cursor-pointer text-primary-variant hover:text-primary" />
                  </TooltipTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>{t("trainFaceAs")}</DropdownMenuLabel>
                  {faceNames.map((faceName) => (
                    <DropdownMenuItem
                      key={faceName}
                      className="cursor-pointer capitalize"
                      onClick={() => onTrainAttempt(faceName)}
                    >
                      {faceName}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent>{t("trainFace")}</TooltipContent>
            </Tooltip>
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
  );
}

type FaceGridProps = {
  faceImages: string[];
  pageToggle: string;
  onDelete: (name: string, ids: string[]) => void;
};
function FaceGrid({ faceImages, pageToggle, onDelete }: FaceGridProps) {
  return (
    <div
      className={cn(
        "scrollbar-container gap-2 overflow-y-scroll",
        isDesktop ? "flex flex-wrap" : "grid grid-cols-2",
      )}
    >
      {faceImages.map((image: string) => (
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
          "w-full overflow-hidden rounded-t-lg border border-t-0 *:text-card-foreground",
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
