import { baseUrl } from "@/api/baseUrl";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { REVIEW_PADDING, ReviewSegment } from "@/types/review";
import { getIconForLabel } from "@/utils/iconUtil";
import { isDesktop, isIOS, isSafari } from "react-device-detect";
import useSWR from "swr";
import TimeAgo from "../dynamic/TimeAgo";
import { useCallback, useMemo, useRef, useState } from "react";
import useImageLoaded from "@/hooks/use-image-loaded";
import ImageLoadingIndicator from "../indicators/ImageLoadingIndicator";
import { FaCompactDisc } from "react-icons/fa";
import { FaCircleCheck } from "react-icons/fa6";
import { HiTrash } from "react-icons/hi";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Drawer, DrawerContent } from "../ui/drawer";
import axios from "axios";
import { toast } from "sonner";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { capitalizeFirstLetter } from "@/utils/stringUtil";

type ReviewCardProps = {
  event: ReviewSegment;
  currentTime: number;
  onClick?: () => void;
};
export default function ReviewCard({
  event,
  currentTime,
  onClick,
}: ReviewCardProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();
  const formattedDate = useFormattedTimestamp(
    event.start_time,
    config?.ui.time_format == "24hour" ? "%H:%M" : "%I:%M %p",
    config?.ui.timezone,
  );
  const isSelected = useMemo(
    () =>
      event.start_time <= currentTime &&
      (event.end_time ?? Date.now() / 1000) >= currentTime,
    [event, currentTime],
  );

  const [optionsOpen, setOptionsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const bypassDialogRef = useRef(false);

  const onMarkAsReviewed = useCallback(async () => {
    await axios.post(`reviews/viewed`, { ids: [event.id] });
    event.has_been_reviewed = true;
    setOptionsOpen(false);
  }, [event]);

  const onExport = useCallback(async () => {
    const endTime = event.end_time
      ? event.end_time + REVIEW_PADDING
      : Date.now() / 1000;

    axios
      .post(
        `export/${event.camera}/start/${event.start_time + REVIEW_PADDING}/end/${endTime}`,
        { playback: "realtime" },
      )
      .then((response) => {
        if (response.status == 200) {
          toast.success(
            "Successfully started export. View the file in the /exports folder.",
            { position: "top-center" },
          );
        }
      })
      .catch((error) => {
        if (error.response?.data?.message) {
          toast.error(
            `Failed to start export: ${error.response.data.message}`,
            { position: "top-center" },
          );
        } else {
          toast.error(`Failed to start export: ${error.message}`, {
            position: "top-center",
          });
        }
      });
    setOptionsOpen(false);
  }, [event]);

  const onDelete = useCallback(async () => {
    await axios.post(`reviews/delete`, { ids: [event.id] });
    event.id = "";
    setOptionsOpen(false);
  }, [event]);

  useKeyboardListener(["Shift"], (_, modifiers) => {
    bypassDialogRef.current = modifiers.shift;
  });

  const handleDelete = useCallback(() => {
    if (bypassDialogRef.current) {
      onDelete();
    } else {
      setDeleteDialogOpen(true);
    }
  }, [bypassDialogRef, onDelete]);

  const content = (
    <div
      className="relative flex w-full cursor-pointer flex-col gap-1.5"
      onClick={onClick}
      onContextMenu={
        isDesktop
          ? undefined
          : (e) => {
              e.preventDefault();
              setOptionsOpen(true);
            }
      }
    >
      <ImageLoadingIndicator
        className="absolute inset-0"
        imgLoaded={imgLoaded}
      />
      <img
        ref={imgRef}
        className={`size-full rounded-lg ${isSelected ? "outline outline-[3px] outline-offset-1 outline-selected" : ""} ${imgLoaded ? "visible" : "invisible"}`}
        src={`${baseUrl}${event.thumb_path.replace("/media/frigate/", "")}`}
        loading={isSafari ? "eager" : "lazy"}
        style={
          isIOS
            ? {
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
              }
            : undefined
        }
        draggable={false}
        onLoad={() => {
          onImgLoad();
        }}
      />
      <div className="flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-evenly gap-1">
              <>
                {event.data.objects.map((object) => {
                  return getIconForLabel(
                    object,
                    "size-3 text-primary dark:text-white",
                  );
                })}
                {event.data.audio.map((audio) => {
                  return getIconForLabel(
                    audio,
                    "size-3 text-primary dark:text-white",
                  );
                })}
              </>
              <div className="font-extra-light text-xs">{formattedDate}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="capitalize">
            {[
              ...new Set([
                ...(event.data.objects || []),
                ...(event.data.sub_labels || []),
                ...(event.data.audio || []),
              ]),
            ]
              .filter(
                (item) => item !== undefined && !item.includes("-verified"),
              )
              .map((text) => capitalizeFirstLetter(text))
              .sort()
              .join(", ")
              .replaceAll("-verified", "")}
          </TooltipContent>
        </Tooltip>
        <TimeAgo
          className="text-xs text-muted-foreground"
          time={event.start_time * 1000}
          dense
        />
      </div>
    </div>
  );

  if (event.id == "") {
    return;
  }

  if (isDesktop) {
    return (
      <>
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              Are you sure you want to delete all recorded video associated with
              this review item?
              <br />
              <br />
              Hold the <em>Shift</em> key to bypass this dialog in the future.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOptionsOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction className="bg-destructive" onClick={onDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <ContextMenu key={event.id}>
          <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>
              <div
                className="flex w-full cursor-pointer items-center justify-start gap-2 p-2"
                onClick={onExport}
              >
                <FaCompactDisc className="text-secondary-foreground" />
                <div className="text-primary">Export</div>
              </div>
            </ContextMenuItem>
            {!event.has_been_reviewed && (
              <ContextMenuItem>
                <div
                  className="flex w-full cursor-pointer items-center justify-start gap-2 p-2"
                  onClick={onMarkAsReviewed}
                >
                  <FaCircleCheck className="text-secondary-foreground" />
                  <div className="text-primary">Mark as reviewed</div>
                </div>
              </ContextMenuItem>
            )}
            <ContextMenuItem>
              <div
                className="flex w-full cursor-pointer items-center justify-start gap-2 p-2"
                onClick={handleDelete}
              >
                <HiTrash className="text-secondary-foreground" />
                <div className="text-primary">
                  {bypassDialogRef.current ? "Delete Now" : "Delete"}
                </div>
              </div>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      </>
    );
  }

  return (
    <>
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Are you sure you want to delete all recorded video associated with
            this review item?
            <br />
            <br />
            Hold the <em>Shift</em> key to bypass this dialog in the future.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOptionsOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={onDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Drawer open={optionsOpen} onOpenChange={setOptionsOpen}>
        {content}
        <DrawerContent>
          <div
            className="flex w-full items-center justify-start gap-2 p-2"
            onClick={onExport}
          >
            <FaCompactDisc className="text-secondary-foreground" />
            <div className="text-primary">Export</div>
          </div>
          {!event.has_been_reviewed && (
            <div
              className="flex w-full items-center justify-start gap-2 p-2"
              onClick={onMarkAsReviewed}
            >
              <FaCircleCheck className="text-secondary-foreground" />
              <div className="text-primary">Mark as reviewed</div>
            </div>
          )}
          <div
            className="flex w-full items-center justify-start gap-2 p-2"
            onClick={handleDelete}
          >
            <HiTrash className="text-secondary-foreground" />
            <div className="text-primary">
              {bypassDialogRef.current ? "Delete Now" : "Delete"}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
