import { baseUrl } from "@/api/baseUrl";
import Chip from "@/components/indicators/Chip";
import UploadImageDialog from "@/components/overlay/dialog/UploadImageDialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import useOptimisticState from "@/hooks/use-optimistic-state";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isDesktop } from "react-device-detect";
import { LuImagePlus, LuTrash } from "react-icons/lu";
import { toast } from "sonner";
import useSWR from "swr";

export default function FaceLibrary() {
  const [page, setPage] = useState<string>();
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);
  const tabsRef = useRef<HTMLDivElement | null>(null);

  // face data

  const { data: faceData, mutate: refreshFaces } = useSWR("faces");

  const faces = useMemo<string[]>(
    () =>
      faceData ? Object.keys(faceData).filter((face) => face != "debug") : [],
    [faceData],
  );
  const faceImages = useMemo<string[]>(
    () => (pageToggle && faceData ? faceData[pageToggle] : []),
    [pageToggle, faceData],
  );

  const faceAttempts = useMemo<string[]>(
    () => faceData?.["debug"] || [],
    [faceData],
  );

  useEffect(() => {
    if (!pageToggle) {
      if (faceAttempts.length > 0) {
        setPageToggle("attempts");
      } else if (faces) {
        setPageToggle(faces[0]);
      }
    } else if (pageToggle == "attempts" && faceAttempts.length == 0) {
      setPageToggle(faces[0]);
    }
    // we need to listen on the value of the faces list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceAttempts, faces]);

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

  return (
    <div className="flex size-full flex-col p-2">
      <Toaster />

      <UploadImageDialog
        open={upload}
        title="Upload Face Image"
        description={`Upload an image to scan for faces and include for ${pageToggle}`}
        setOpen={setUpload}
        onSave={onUploadImage}
      />

      <div className="relative flex h-11 w-full items-center justify-between">
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
              {faceAttempts.length > 0 && (
                <>
                  <ToggleGroupItem
                    value="attempts"
                    className={`flex scroll-mx-10 items-center justify-between gap-2 ${pageToggle == "attempts" ? "" : "*:text-muted-foreground"}`}
                    data-nav-item="attempts"
                    aria-label="Select attempts"
                  >
                    <div>Attempts</div>
                  </ToggleGroupItem>
                  <div>|</div>
                </>
              )}

              {Object.values(faces).map((item) => (
                <ToggleGroupItem
                  key={item}
                  className={`flex scroll-mx-10 items-center justify-between gap-2 ${pageToggle == item ? "" : "*:text-muted-foreground"}`}
                  value={item}
                  data-nav-item={item}
                  aria-label={`Select ${item}`}
                >
                  <div className="capitalize">{item}</div>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <ScrollBar orientation="horizontal" className="h-0" />
          </div>
        </ScrollArea>
      </div>
      {pageToggle &&
        (pageToggle == "attempts" ? (
          <AttemptsGrid attemptImages={faceAttempts} onRefresh={refreshFaces} />
        ) : (
          <FaceGrid
            faceImages={faceImages}
            pageToggle={pageToggle}
            setUpload={setUpload}
            onRefresh={refreshFaces}
          />
        ))}
    </div>
  );
}

type AttemptsGridProps = {
  attemptImages: string[];
  onRefresh: () => void;
};
function AttemptsGrid({ attemptImages, onRefresh }: AttemptsGridProps) {
  return (
    <div className="scrollbar-container flex flex-wrap gap-2 overflow-y-scroll">
      {attemptImages.map((image: string) => (
        <FaceAttempt key={image} image={image} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

type FaceAttemptProps = {
  image: string;
  onRefresh: () => void;
};
function FaceAttempt({ image, onRefresh }: FaceAttemptProps) {
  const [hovered, setHovered] = useState(false);

  const data = useMemo(() => {
    const parts = image.split("-");

    return {
      eventId: `${parts[0]}-${parts[1]}`,
      name: parts[2],
      score: parts[3],
    };
  }, [image]);

  const onDelete = useCallback(() => {
    axios
      .post(`/faces/debug/delete`, { ids: [image] })
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
    <div
      className="relative h-min"
      onMouseEnter={isDesktop ? () => setHovered(true) : undefined}
      onMouseLeave={isDesktop ? () => setHovered(false) : undefined}
      onClick={isDesktop ? undefined : () => setHovered(!hovered)}
    >
      {hovered && (
        <div className="absolute right-1 top-1">
          <Chip
            className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500"
            onClick={() => onDelete()}
          >
            <LuTrash className="size-4 fill-destructive text-destructive" />
          </Chip>
        </div>
      )}
      <div className="rounded-md bg-secondary">
        <img
          className="h-40 rounded-md"
          src={`${baseUrl}clips/faces/debug/${image}`}
        />
        <div className="p-2">{`${data.name}: ${data.score}`}</div>
      </div>
    </div>
  );
}

type FaceGridProps = {
  faceImages: string[];
  pageToggle: string;
  setUpload: (upload: boolean) => void;
  onRefresh: () => void;
};
function FaceGrid({
  faceImages,
  pageToggle,
  setUpload,
  onRefresh,
}: FaceGridProps) {
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
      <Button key="upload" className="size-40" onClick={() => setUpload(true)}>
        <LuImagePlus className="size-10" />
      </Button>
    </div>
  );
}

type FaceImageProps = {
  name: string;
  image: string;
  onRefresh: () => void;
};
function FaceImage({ name, image, onRefresh }: FaceImageProps) {
  const [hovered, setHovered] = useState(false);

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
    <div
      className="relative h-40"
      onMouseEnter={isDesktop ? () => setHovered(true) : undefined}
      onMouseLeave={isDesktop ? () => setHovered(false) : undefined}
      onClick={isDesktop ? undefined : () => setHovered(!hovered)}
    >
      {hovered && (
        <div className="absolute right-1 top-1">
          <Chip
            className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500"
            onClick={() => onDelete()}
          >
            <LuTrash className="size-4 fill-destructive text-destructive" />
          </Chip>
        </div>
      )}
      <img
        className="h-40 rounded-md"
        src={`${baseUrl}clips/faces/${name}/${image}`}
      />
    </div>
  );
}
