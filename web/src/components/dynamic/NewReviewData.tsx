import { ReviewSegment } from "@/types/review";
import { Button } from "../ui/button";
import { LuRefreshCcw } from "react-icons/lu";
import { MutableRefObject, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type NewReviewDataProps = {
  className: string;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  reviewItems?: ReviewSegment[] | null;
  itemsToReview?: number;
  pullLatestData: () => void;
};
export default function NewReviewData({
  className,
  contentRef,
  reviewItems,
  itemsToReview,
  pullLatestData,
}: NewReviewDataProps) {
  const { t } = useTranslation(["views/events"]);
  const hasUpdate = useMemo(() => {
    if (!reviewItems || !itemsToReview) {
      return false;
    }

    return reviewItems.length < itemsToReview;
  }, [reviewItems, itemsToReview]);

  return (
    <div className={className}>
      <div className="pointer-events-auto mr-[65px] mt-8 flex items-center justify-center md:mr-[115px]">
        <Button
          className={cn(
            hasUpdate
              ? "duration-500 animate-in slide-in-from-top"
              : "invisible",
            "mx-auto bg-gray-400 text-center text-white",
          )}
          aria-label={t("newReviewItems.label")}
          onClick={() => {
            pullLatestData();
            if (contentRef.current) {
              contentRef.current.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }
          }}
        >
          <LuRefreshCcw className="mr-2 h-4 w-4" />
          {t("newReviewItems.button")}
        </Button>
      </div>
    </div>
  );
}
