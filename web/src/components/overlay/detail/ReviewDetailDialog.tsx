import { isDesktop, isIOS } from "react-device-detect";
import { Sheet, SheetContent } from "../../ui/sheet";
import { Drawer, DrawerContent } from "../../ui/drawer";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { getIconForLabel } from "@/utils/iconUtil";
import { useApiHost } from "@/api";
import { ReviewSegment } from "@/types/review";
import { Event } from "@/types/event";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { FrigatePlusDialog } from "../dialog/FrigatePlusDialog";

type ReviewDetailDialogProps = {
  review?: ReviewSegment;
  setReview: (review: ReviewSegment | undefined) => void;
};
export default function ReviewDetailDialog({
  review,
  setReview,
}: ReviewDetailDialogProps) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const apiHost = useApiHost();

  // upload

  const [upload, setUpload] = useState<Event>();

  // data

  const { data: events } = useSWR<Event[]>(
    review ? ["event_ids", { ids: review.data.detections.join(",") }] : null,
  );

  const hasMismatch = useMemo(() => {
    if (!review || !events) {
      return false;
    }

    return events.length != review?.data.detections.length;
  }, [review, events]);

  const formattedDate = useFormattedTimestamp(
    review?.start_time ?? 0,
    config?.ui.time_format == "24hour"
      ? "%b %-d %Y, %H:%M"
      : "%b %-d %Y, %I:%M %p",
  );

  // content

  const Overlay = isDesktop ? Sheet : Drawer;
  const Content = isDesktop ? SheetContent : DrawerContent;

  return (
    <Overlay
      open={review != undefined}
      onOpenChange={(open) => {
        if (!open) {
          setReview(undefined);
        }
      }}
    >
      <FrigatePlusDialog
        upload={upload}
        onClose={() => setUpload(undefined)}
        onEventUploaded={() => {
          if (upload) {
            upload.plus_id = "new_upload";
          }
        }}
      />

      <Content
        className={
          isDesktop ? "sm:max-w-xl" : "max-h-[75dvh] overflow-x-hidden p-2 pb-4"
        }
      >
        {review && (
          <div className="mt-3 flex size-full flex-col gap-5 md:mt-0">
            <div className="flex w-full flex-row">
              <div className="flex w-full flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm text-primary/40">Camera</div>
                  <div className="text-sm capitalize">
                    {review.camera.replaceAll("_", " ")}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm text-primary/40">Timestamp</div>
                  <div className="text-sm">{formattedDate}</div>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 px-6">
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm text-primary/40">Objects</div>
                  <div className="flex flex-col items-start gap-2 text-sm capitalize">
                    {events?.map((event) => {
                      return (
                        <div
                          key={event.id}
                          className="flex flex-row items-center gap-2 text-sm capitalize"
                        >
                          {getIconForLabel(event.label, "size-3 text-white")}
                          {event.sub_label ?? event.label} (
                          {Math.round(event.data.top_score * 100)}%)
                        </div>
                      );
                    })}
                  </div>
                </div>
                {review.data.zones.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <div className="text-sm text-primary/40">Zones</div>
                    <div className="flex flex-col items-start gap-2 text-sm capitalize">
                      {review.data.zones.map((zone) => {
                        return (
                          <div
                            key={zone}
                            className="flex flex-row items-center gap-2 text-sm capitalize"
                          >
                            {zone.replaceAll("_", " ")}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {hasMismatch && (
              <div className="p-4 text-center text-sm">
                Some objects that were detected are not included in this list
                because the object does not have a snapshot
              </div>
            )}
            <div className="scrollbar-container flex w-full flex-col gap-2 overflow-y-auto px-6">
              {events?.map((event) => {
                return (
                  <img
                    key={event.id}
                    className={cn(
                      "aspect-video select-none rounded-lg object-contain transition-opacity",
                      event.has_snapshot &&
                        event.plus_id == undefined &&
                        config?.plus.enabled &&
                        "cursor-pointer",
                    )}
                    style={
                      isIOS
                        ? {
                            WebkitUserSelect: "none",
                            WebkitTouchCallout: "none",
                          }
                        : undefined
                    }
                    draggable={false}
                    src={
                      event.has_snapshot
                        ? `${apiHost}api/events/${event.id}/snapshot.jpg`
                        : `${apiHost}api/events/${event.id}/thumbnail.jpg`
                    }
                    onClick={() => {
                      if (
                        event.has_snapshot &&
                        event.plus_id == undefined &&
                        config?.plus.enabled
                      ) {
                        setUpload(event);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </Content>
    </Overlay>
  );
}
