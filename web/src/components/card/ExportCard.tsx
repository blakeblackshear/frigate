import { baseUrl } from "@/api/baseUrl";
import ActivityIndicator from "../indicators/activity-indicator";
import { LuPencil, LuTrash } from "react-icons/lu";
import { Button } from "../ui/button";
import { useMemo, useRef, useState } from "react";
import { isDesktop } from "react-device-detect";
import { FaPlay } from "react-icons/fa";
import Chip from "../indicators/Chip";
import { Skeleton } from "../ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import useKeyboardListener from "@/hooks/use-keyboard-listener";

type ExportProps = {
  className: string;
  file: {
    name: string;
  };
  onRename: (original: string, update: string) => void;
  onDelete: (file: string) => void;
};

export default function ExportCard({
  className,
  file,
  onRename,
  onDelete,
}: ExportProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const inProgress = useMemo(
    () => file.name.startsWith("in_progress"),
    [file.name],
  );

  // editing name

  const [editName, setEditName] = useState<{
    original: string;
    update: string;
  }>();

  useKeyboardListener(
    editName != undefined ? ["Enter"] : [],
    (_, down, repeat) => {
      if (down && !repeat && editName && editName.update.length > 0) {
        onRename(editName.original, editName.update.replaceAll(" ", "_"));
        setEditName(undefined);
      }
    },
  );

  return (
    <>
      <Dialog
        open={editName != undefined}
        onOpenChange={(open) => {
          if (!open) {
            setEditName(undefined);
          }
        }}
      >
        <DialogContent>
          <DialogTitle>Rename Export</DialogTitle>
          {editName && (
            <>
              <Input
                className="mt-3"
                type="search"
                placeholder={editName?.original}
                value={editName?.update}
                onChange={(e) =>
                  setEditName({
                    original: editName.original ?? "",
                    update: e.target.value,
                  })
                }
              />
              <DialogFooter>
                <Button
                  size="sm"
                  variant="select"
                  disabled={(editName?.update?.length ?? 0) == 0}
                  onClick={() => {
                    onRename(
                      editName.original,
                      editName.update.replaceAll(" ", "_"),
                    );
                    setEditName(undefined);
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div
        className={`relative aspect-video bg-black rounded-2xl flex justify-center items-center ${className}`}
        onMouseEnter={
          isDesktop && !inProgress ? () => setHovered(true) : undefined
        }
        onMouseLeave={
          isDesktop && !inProgress ? () => setHovered(false) : undefined
        }
        onClick={
          isDesktop || inProgress ? undefined : () => setHovered(!hovered)
        }
      >
        {hovered && (
          <>
            {!playing && (
              <div className="absolute inset-0 z-10 bg-black bg-opacity-60 rounded-2xl" />
            )}
            <div className="absolute top-1 right-1 flex items-center gap-2">
              <Chip
                className="bg-gradient-to-br from-gray-400 to-gray-500 bg-gray-500 rounded-md cursor-pointer"
                onClick={() => setEditName({ original: file.name, update: "" })}
              >
                <LuPencil className="size-4 text-white" />
              </Chip>
              <Chip
                className="bg-gradient-to-br from-gray-400 to-gray-500 bg-gray-500 rounded-md cursor-pointer"
                onClick={() => onDelete(file.name)}
              >
                <LuTrash className="size-4 text-destructive fill-destructive" />
              </Chip>
            </div>
            {!playing && (
              <Button
                className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-20 h-20 z-20 text-white hover:text-white hover:bg-transparent"
                variant="ghost"
                onClick={() => {
                  setPlaying(true);
                  videoRef.current?.play();
                }}
              >
                <FaPlay />
              </Button>
            )}
          </>
        )}
        {inProgress ? (
          <ActivityIndicator />
        ) : (
          <video
            ref={videoRef}
            className="absolute inset-0 aspect-video rounded-2xl"
            playsInline
            preload="auto"
            muted
            controls={playing}
            onLoadedData={() => setLoading(false)}
          >
            <source src={`${baseUrl}exports/${file.name}`} type="video/mp4" />
          </video>
        )}
        {loading && (
          <Skeleton className="absolute inset-0 aspect-video rounded-2xl" />
        )}
        {!playing && (
          <div className="absolute bottom-0 inset-x-0 rounded-b-l z-10 h-[20%] bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-2xl">
            <div className="flex h-full justify-between items-end mx-3 pb-1 text-white text-sm capitalize">
              {file.name
                .substring(0, file.name.length - 4)
                .replaceAll("_", " ")}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
