import { baseUrl } from "@/api/baseUrl";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { FrigateConfig } from "@/types/frigateConfig";
import { REVIEW_PADDING, ReviewSegment } from "@/types/review";
import { getIconForLabel } from "@/utils/iconUtil";
import { isDesktop, isIOS, isSafari } from "react-device-detect";
import useSWR from "swr";
import TimeAgo from "../dynamic/TimeAgo";
import { useCallback, useRef, useState } from "react";
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
import { Button, buttonVariants } from "../ui/button";
import { Trans, useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { LuCircle } from "react-icons/lu";
import { MdAutoAwesome } from "react-icons/md";
import { GenAISummaryDialog } from "../overlay/chip/GenAISummaryChip";
import { getTranslatedLabel } from "@/utils/i18n";
import { formatList } from "@/utils/stringUtil";

type ReviewCardProps = {
  event: ReviewSegment;
  activeReviewItem?: ReviewSegment;
  onClick?: () => void;
};
export default function ReviewCard({
  event,
  activeReviewItem,
  onClick,
}: ReviewCardProps) {
  const { t } = useTranslation(["components/dialog"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();
  const formattedDate = useFormattedTimestamp(
    event.start_time,
    config?.ui.time_format == "24hour"
      ? t("time.formattedTimestampHourMinute.24hour", { ns: "common" })
      : t("time.formattedTimestampHourMinute.12hour", { ns: "common" }),
    config?.ui.timezone,
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
          toast.success(t("export.toast.success"), {
            position: "top-center",
            action: (
              <a href="/export" target="_blank" rel="noopener noreferrer">
                <Button>{t("export.toast.view")}</Button>
              </a>
            ),
          });
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message || error.message || "Unknown error";
        toast.error(t("export.toast.error.failed", { error: errorMessage }), {
          position: "top-center",
        });
      });
    setOptionsOpen(false);
  }, [event, t]);

  const onDelete = useCallback(async () => {
    await axios.post(`reviews/delete`, { ids: [event.id] });
    event.id = "";
    setOptionsOpen(false);
  }, [event]);

  useKeyboardListener(["Shift"], (_, modifiers) => {
    bypassDialogRef.current = modifiers.shift;
    return false;
  });

  const handleDelete = useCallback(() => {
    if (bypassDialogRef.current) {
      onDelete();
    } else {
      setDeleteDialogOpen(true);
    }
  }, [bypassDialogRef, onDelete]);

  const getEventType = (text: string) => {
    if (event.data.sub_labels?.includes(text)) return "manual";
    if (event.data.audio.includes(text)) return "audio";
    return "object";
  };

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
        className={cn(
          "size-full rounded-lg",
          activeReviewItem?.id == event.id &&
            "outline outline-[3px] -outline-offset-[2.8px] outline-selected duration-200",
          imgLoaded ? "visible" : "invisible",
        )}
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
            <div className="flex items-center gap-2">
              <LuCircle
                className={cn(
                  "size-2",
                  event.severity == "alert"
                    ? "fill-severity_alert text-severity_alert"
                    : "fill-severity_detection text-severity_detection",
                )}
              />
              <div className="flex items-center gap-1">
                {event.data.objects.map((object, idx) => (
                  <div
                    key={`${object}-${idx}`}
                    className="rounded-full bg-muted-foreground p-1"
                  >
                    {getIconForLabel(object, "object", "size-3 text-white")}
                  </div>
                ))}
                {event.data.audio.map((audio, idx) => (
                  <div
                    key={`${audio}-${idx}`}
                    className="rounded-full bg-muted-foreground p-1"
                  >
                    {getIconForLabel(audio, "audio", "size-3 text-white")}
                  </div>
                ))}
              </div>
              <div className="font-extra-light text-xs">{formattedDate}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="smart-capitalize">
            {formatList(
              [
                ...new Set([
                  ...(event.data.objects || []),
                  ...(event.data.sub_labels || []),
                  ...(event.data.audio || []),
                ]),
              ]
                .filter(
                  (item) => item !== undefined && !item.includes("-verified"),
                )
                .map((text) => getTranslatedLabel(text, getEventType(text)))
                .sort(),
            )}
          </TooltipContent>
        </Tooltip>
        <TimeAgo
          className="text-xs text-muted-foreground"
          time={event.start_time * 1000}
          dense
        />
      </div>
      {event.data.metadata?.title && (
        <GenAISummaryDialog review={event}>
          <div className="flex items-center gap-1.5 rounded bg-secondary/50 hover:underline">
            <MdAutoAwesome className="size-3 shrink-0 text-primary" />
            <span className="truncate text-xs text-primary">
              {event.data.metadata.title}
            </span>
          </div>
        </GenAISummaryDialog>
      )}
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
              <AlertDialogTitle>
                {t("recording.confirmDelete.title")}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              <Trans ns="components/dialog">
                recording.confirmDelete.title
              </Trans>
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOptionsOpen(false)}>
                {t("button.cancel", { ns: "common" })}
              </AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={onDelete}
              >
                {t("button.delete", { ns: "common" })}
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
                <div className="text-primary">
                  {t("recording.button.export")}
                </div>
              </div>
            </ContextMenuItem>
            {!event.has_been_reviewed && (
              <ContextMenuItem>
                <div
                  className="flex w-full cursor-pointer items-center justify-start gap-2 p-2"
                  onClick={onMarkAsReviewed}
                >
                  <FaCircleCheck className="text-secondary-foreground" />
                  <div className="text-primary">
                    {t("recording.button.markAsReviewed")}
                  </div>
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
                  {bypassDialogRef.current
                    ? t("recording.button.deleteNow")
                    : t("button.delete", { ns: "common" })}
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
            <AlertDialogTitle>
              {t("recording.confirmDelete.title")}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <Trans ns="components/dialog">
              recording.confirmDelete.desc.selected
            </Trans>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOptionsOpen(false)}>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={onDelete}
            >
              {t("button.delete", { ns: "common" })}
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
            <div className="text-primary">{t("recording.button.export")}</div>
          </div>
          {!event.has_been_reviewed && (
            <div
              className="flex w-full items-center justify-start gap-2 p-2"
              onClick={onMarkAsReviewed}
            >
              <FaCircleCheck className="text-secondary-foreground" />
              <div className="text-primary">
                {t("recording.button.markAsReviewed")}
              </div>
            </div>
          )}
          <div
            className="flex w-full items-center justify-start gap-2 p-2"
            onClick={handleDelete}
          >
            <HiTrash className="text-secondary-foreground" />
            <div className="text-primary">
              {bypassDialogRef.current
                ? t("recording.button.deleteNow")
                : t("button.delete", { ns: "common" })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
