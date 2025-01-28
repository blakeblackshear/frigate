import { baseUrl } from "@/api/baseUrl";
import AddFaceIcon from "@/components/icons/AddFaceIcon";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import UploadImageDialog from "@/components/overlay/dialog/UploadImageDialog";
import { Button } from "@/components/ui/button";
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
import useOptimisticState from "@/hooks/use-optimistic-state";
import { cn } from "@/lib/utils";
import { FrigateConfig } from "@/types/frigateConfig";
import axios, { AxiosError } from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuImagePlus, LuTrash2, LuUserPlus, LuPencil } from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function FaceLibrary() {
  const { data: config } = useSWR<FrigateConfig>("config");

  // title

  useEffect(() => {
    document.title = "Face Library - Frigate";
  }, []);

  const [page, setPage] = useState<string>();
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  // face data

  const { data: faceData, mutate: refreshFaces } = useSWR("faces");

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

  const onUploadImage = useCallback(
    (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      axios
        .post(`faces/${pageToggle}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then((resp) => {
          if (resp.status == 200) {
            setUpload(false);
            refreshFaces();
            toast.success(
              "Successfully uploaded image. View the file in the /exports folder.",
              { position: "top-center" },
            );
          }
        })
        .catch((error) => {
          if (error.response?.data?.message) {
            toast.error(
              `Failed to upload image: ${error.response.data.message}`,
              { position: "top-center" },
            );
          } else {
            toast.error(`Failed to upload image: ${error.message}`, {
              position: "top-center",
            });
          }
        });
    },
    [pageToggle, refreshFaces],
  );

  const [newFaceDialog, setNewFaceDialog] = useState(false);
  const [isCreatingFace, setIsCreatingFace] = useState(false);
  const [newFaceName, setNewFaceName] = useState("");

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      createNewFace();
    }
  };

  const createNewFace = useCallback(async () => {
    if (!newFaceName.trim()) {
      toast.error("Face name cannot be empty", { position: "top-center" });
      return;
    }
    
    setIsCreatingFace(true);
    try {
      const resp = await axios.post(`/faces/${newFaceName}/create`);
      
      if (resp.status === 200) {
        setNewFaceDialog(false);
        setNewFaceName("");
        refreshFaces();
        toast.success("Successfully created new face", { position: "top-center" });
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      toast.error(
        `Failed to create face: ${axiosError.response?.data?.message || axiosError.message}`,
        { position: "top-center" }
      );
    } finally {
      setIsCreatingFace(false);
    }
  }, [newFaceName, refreshFaces]);

  const [renameDialog, setRenameDialog] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameData, setRenameData] = useState<{ oldName: string; newName: string }>({ oldName: '', newName: '' });

  const renameFace = useCallback(async () => {
    if (!renameData.newName.trim()) {
      toast.error("Face name cannot be empty", { position: "top-center" });
      return;
    }

    setIsRenaming(true);
    try {
      await axios.post(`/faces/${renameData.newName}/create`);

      const oldFaceImages = faceData[renameData.oldName] || [];
      for (const image of oldFaceImages) {
        const response = await fetch(`${baseUrl}clips/faces/${renameData.oldName}/${image}`);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('file', blob, image);
        await axios.post(`/faces/${renameData.newName}`, formData);
      }

      if (oldFaceImages.length > 0) {
        await axios.post(`/faces/${renameData.oldName}/delete`, {
          ids: oldFaceImages
        });
      } else {
        await axios.post(`/faces/${renameData.oldName}/delete`, {
          ids: ['dummy']  // Send a dummy ID to pass validation
        });
      }

      setRenameDialog(false);
      setRenameData({ oldName: '', newName: '' });
      refreshFaces();
      toast.success("Successfully renamed face", { position: "top-center" });
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      toast.error(
        `Failed to rename face: ${axiosError.response?.data?.message || axiosError.message}`,
        { position: "top-center" }
      );
    } finally {
      setIsRenaming(false);
    }
  }, [renameData, faceData, refreshFaces]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster />

      <Dialog open={newFaceDialog} onOpenChange={setNewFaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Face</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Enter face name"
              value={newFaceName}
              onChange={(e) => setNewFaceName(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isCreatingFace}
            />
            <Button onClick={createNewFace} disabled={isCreatingFace}>
              {isCreatingFace ? "Creating..." : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialog} onOpenChange={setRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Face</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Enter new name"
              value={renameData.newName}
              onChange={(e) => setRenameData(prev => ({ ...prev, newName: e.target.value }))}
              onKeyPress={(e) => e.key === 'Enter' && renameFace()}
              disabled={isRenaming}
            />
            <Button onClick={renameFace} disabled={isRenaming}>
              {isRenaming ? "Renaming..." : "Rename"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UploadImageDialog
        open={upload}
        title="Upload Face Image"
        description={`Upload an image to scan for faces and include for ${pageToggle}`}
        setOpen={setUpload}
        onSave={onUploadImage}
      />

      <div className="relative mb-2 flex h-11 w-full items-center justify-between">
        <ScrollArea className="w-full whitespace-nowrap">
          <div ref={tabsRef} className="flex flex-row">
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
                    aria-label="Select train"
                  >
                    <div>Train</div>
                  </ToggleGroupItem>
                  <div>|</div>
                </>
              )}

              {Object.values(faces).map((item) => (
                <ToggleGroupItem
                  key={item}
                  className={`flex scroll-mx-10 items-center justify-between gap-2 ${
                    pageToggle == item ? "" : "*:text-muted-foreground"
                  }`}
                  value={item}
                  data-nav-item={item}
                  aria-label={`Select ${item}`}
                >
                  <div className="capitalize">
                    {item} ({faceData[item].length})
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameData({ oldName: item, newName: item });
                          setRenameDialog(true);
                        }}
                      >
                        <LuPencil className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Rename Face</TooltipContent>
                  </Tooltip>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="flex gap-2" 
            onClick={() => setNewFaceDialog(true)}
          >
            <LuUserPlus className="size-5" />
            New Face
          </Button>
          <Button className="flex gap-2" onClick={() => setUpload(true)}>
            <LuImagePlus className="size-7 rounded-md p-1 text-secondary-foreground" />
            Upload Image
          </Button>
        </div>
      </div>
      {pageToggle &&
        (pageToggle == "train" ? (
          <TrainingGrid
            config={config}
            attemptImages={trainImages}
            faceNames={faces}
            onRefresh={refreshFaces}
          />
        ) : (
          <FaceGrid
            faceImages={faceImages}
            pageToggle={pageToggle}
            onRefresh={refreshFaces}
          />
        ))}
    </div>
  );
}

type TrainingGridProps = {
  config: FrigateConfig;
  attemptImages: string[];
  faceNames: string[];
  onRefresh: () => void;
};
function TrainingGrid({
  config,
  attemptImages,
  faceNames,
  onRefresh,
}: TrainingGridProps) {
  return (
    <div className="scrollbar-container flex flex-wrap gap-2 overflow-y-scroll">
      {attemptImages.map((image: string) => (
        <FaceAttempt
          key={image}
          image={image}
          faceNames={faceNames}
          threshold={config.face_recognition.threshold}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

type FaceAttemptProps = {
  image: string;
  faceNames: string[];
  threshold: number;
  onRefresh: () => void;
};
function FaceAttempt({
  image,
  faceNames,
  threshold,
  onRefresh,
}: FaceAttemptProps) {
  const data = useMemo(() => {
    const parts = image.split("-");

    return {
      eventId: `${parts[0]}-${parts[1]}`,
      name: parts[2],
      score: parts[3],
    };
  }, [image]);

  const onTrainAttempt = useCallback(
    (trainName: string) => {
      axios
        .post(`/faces/train/${trainName}/classify`, { training_file: image })
        .then((resp) => {
          if (resp.status == 200) {
            toast.success(`Successfully trained face.`, {
              position: "top-center",
            });
            onRefresh();
          }
        })
        .catch((error) => {
          if (error.response?.data?.message) {
            toast.error(`Failed to train: ${error.response.data.message}`, {
              position: "top-center",
            });
          } else {
            toast.error(`Failed to train: ${error.message}`, {
              position: "top-center",
            });
          }
        });
    },
    [image, onRefresh],
  );

  const onDelete = useCallback(() => {
    axios
      .post(`/faces/train/delete`, { ids: [image] })
      .then((resp) => {
        if (resp.status == 200) {
          toast.success(`Successfully deleted face.`, {
            position: "top-center",
          });
          onRefresh();
        }
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          toast.error(`Failed to delete: ${error.response.data.message}`, {
            position: "top-center",
          });
        } else {
          toast.error(`Failed to delete: ${error.message}`, {
            position: "top-center",
          });
        }
      });
  }, [image, onRefresh]);

  return (
    <div className="relative flex flex-col rounded-lg">
      <div className="w-full overflow-hidden rounded-t-lg border border-t-0 *:text-card-foreground">
        <img className="h-40" src={`${baseUrl}clips/faces/train/${image}`} />
      </div>
      <div className="rounded-b-lg bg-card p-2">
        <div className="flex w-full flex-row items-center justify-between gap-2">
          <div className="flex flex-col items-start text-xs text-primary-variant">
            <div className="capitalize">{data.name}</div>
            <div
              className={cn(
                Number.parseFloat(data.score) >= threshold
                  ? "text-success"
                  : "text-danger",
              )}
            >
              {Number.parseFloat(data.score) * 100}%
            </div>
          </div>
          <div className="flex flex-row items-start justify-end gap-5 md:gap-4">
            <Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <TooltipTrigger>
                    <AddFaceIcon className="size-5 cursor-pointer text-primary-variant hover:text-primary" />
                  </TooltipTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Train Face as:</DropdownMenuLabel>
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
              <TooltipContent>Train Face as Person</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <LuTrash2
                  className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                  onClick={onDelete}
                />
              </TooltipTrigger>
              <TooltipContent>Delete Face Attempt</TooltipContent>
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
  onRefresh: () => void;
};
function FaceGrid({ faceImages, pageToggle, onRefresh }: FaceGridProps) {
  return (
    <div className="scrollbar-container flex flex-wrap gap-2 overflow-y-scroll">
      {faceImages.map((image: string) => (
        <FaceImage
          key={image}
          name={pageToggle}
          image={image}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}

type FaceImageProps = {
  name: string;
  image: string;
  onRefresh: () => void;
};
function FaceImage({ name, image, onRefresh }: FaceImageProps) {
  const onDelete = useCallback(() => {
    axios
      .post(`/faces/${name}/delete`, { ids: [image] })
      .then((resp) => {
        if (resp.status == 200) {
          toast.success(`Successfully deleted face.`, {
            position: "top-center",
          });
          onRefresh();
        }
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          toast.error(`Failed to delete: ${error.response.data.message}`, {
            position: "top-center",
          });
        } else {
          toast.error(`Failed to delete: ${error.message}`, {
            position: "top-center",
          });
        }
      });
  }, [name, image, onRefresh]);

  return (
    <div className="relative flex flex-col rounded-lg">
      <div className="w-full overflow-hidden rounded-t-lg border border-t-0 *:text-card-foreground">
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
                  onClick={onDelete}
                />
              </TooltipTrigger>
              <TooltipContent>Delete Face Attempt</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}