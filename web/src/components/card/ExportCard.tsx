import ActivityIndicator from "../indicators/activity-indicator";
import { LuTrash } from "react-icons/lu";
import { Button } from "../ui/button";
import { useState } from "react";
import { isDesktop } from "react-device-detect";
import { FaDownload, FaPlay } from "react-icons/fa";
import Chip from "../indicators/Chip";
import { Skeleton } from "../ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { DeleteClipType, Export } from "@/types/export";
import { MdEditSquare } from "react-icons/md";
import { baseUrl } from "@/api/baseUrl";
import { cn } from "@/lib/utils";

type ExportProps = {
  className: string;
  exportedRecording: Export;
  onSelect: (selected: Export) => void;
  onRename: (original: string, update: string) => void;
  onDelete: ({ file, exportName }: DeleteClipType) => void;
};

export default function ExportCard({
  className,
  exportedRecording,
  onSelect,
  onRename,
  onDelete,
}: ExportProps) {
  const [hovered, setHovered] = useState(false);
  const [loading, setLoading] = useState(
    exportedRecording.thumb_path.length > 0,
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
        onRename(exportedRecording.id, editName.update);
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
          <DialogDescription>
            Enter a new name for this export.
          </DialogDescription>
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
                    onRename(exportedRecording.id, editName.update);
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
        className={cn(
          "relative flex aspect-video items-center justify-center rounded-lg bg-black md:rounded-2xl",
          className,
        )}
        onMouseEnter={
          isDesktop && !exportedRecording.in_progress
            ? () => setHovered(true)
            : undefined
        }
        onMouseLeave={
          isDesktop && !exportedRecording.in_progress
            ? () => setHovered(false)
            : undefined
        }
        onClick={
          isDesktop || exportedRecording.in_progress
            ? undefined
            : () => setHovered(!hovered)
        }
      >
        {hovered && (
          <>
            <div className="absolute inset-0 z-10 rounded-lg bg-black bg-opacity-60 md:rounded-2xl" />
            <div className="absolute right-1 top-1 flex items-center gap-2">
              <a
                className="z-20"
                download
                href={`${baseUrl}${exportedRecording.video_path.replace("/media/frigate/", "")}`}
              >
                <Chip className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500">
                  <FaDownload className="size-4 text-white" />
                </Chip>
              </a>
              <Chip
                className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500"
                onClick={() =>
                  setEditName({ original: exportedRecording.name, update: "" })
                }
              >
                <MdEditSquare className="size-4 text-white" />
              </Chip>
              <Chip
                className="cursor-pointer rounded-md bg-gray-500 bg-gradient-to-br from-gray-400 to-gray-500"
                onClick={() =>
                  onDelete({
                    file: exportedRecording.id,
                    exportName: exportedRecording.name,
                  })
                }
              >
                <LuTrash className="size-4 fill-destructive text-destructive" />
              </Chip>
            </div>

            <Button
              className="absolute left-1/2 top-1/2 z-20 h-20 w-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer text-white hover:bg-transparent hover:text-white"
              variant="ghost"
              onClick={() => {
                onSelect(exportedRecording);
              }}
            >
              <FaPlay />
            </Button>
          </>
        )}
        {exportedRecording.in_progress ? (
          <ActivityIndicator />
        ) : (
          <>
            {exportedRecording.thumb_path.length > 0 ? (
              <img
                className="absolute inset-0 aspect-video size-full rounded-lg object-contain md:rounded-2xl"
                src={exportedRecording.thumb_path.replace("/media/frigate", "")}
                onLoad={() => setLoading(false)}
              />
            ) : (
              <div className="absolute inset-0 rounded-lg bg-secondary md:rounded-2xl" />
            )}
          </>
        )}
        {loading && (
          <Skeleton className="absolute inset-0 aspect-video rounded-lg md:rounded-2xl" />
        )}
        <div className="rounded-b-l pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[20%] rounded-lg bg-gradient-to-t from-black/60 to-transparent md:rounded-2xl">
          <div className="mx-3 flex h-full items-end justify-between pb-1 text-sm capitalize text-white">
            {exportedRecording.name.replaceAll("_", " ")}
          </div>
        </div>
      </div>
    </>
  );
}
