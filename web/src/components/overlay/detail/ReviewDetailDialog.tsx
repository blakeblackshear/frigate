import { isDesktop, isIOS } from "react-device-detect";
import { Sheet, SheetContent } from "../../ui/sheet";
import { Drawer, DrawerContent } from "../../ui/drawer";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { getIconForLabel } from "@/utils/iconUtil";
import { useApiHost } from "@/api";
import { ReviewSegment } from "@/types/review";

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

  // data

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
      <Content
        className={
          isDesktop ? "sm:max-w-xl" : "max-h-[75dvh] overflow-hidden p-2 pb-4"
        }
      >
        {review && (
          <div className="mt-3 flex size-full flex-col gap-5 md:mt-0">
            <div className="flex w-full flex-row">
              <div className="flex w-full flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="text-sm text-primary/40">Labels</div>
                  <div className="flex flex-col items-start gap-2 text-sm capitalize">
                    {[
                      ...new Set([
                        ...(review.data.objects || []),
                        ...(review.data.sub_labels || []),
                        ...(review.data.audio || []),
                      ]),
                    ]
                      .filter(
                        (item) =>
                          item !== undefined && !item.includes("-verified"),
                      )
                      .sort()
                      .map((obj) => {
                        return (
                          <div
                            key={obj}
                            className="flex flex-row items-center gap-2 text-sm capitalize"
                          >
                            {getIconForLabel(obj, "size-3 text-white")}
                            {obj}
                          </div>
                        );
                      })}
                  </div>
                </div>
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
                {review.data.detections.map((eventId) => {
                  return (
                    <img
                      key={eventId}
                      className="aspect-video select-none rounded-lg object-contain transition-opacity"
                      style={
                        isIOS
                          ? {
                              WebkitUserSelect: "none",
                              WebkitTouchCallout: "none",
                            }
                          : undefined
                      }
                      draggable={false}
                      src={`${apiHost}api/events/${eventId}/thumbnail.jpg`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Content>
    </Overlay>
  );
}
