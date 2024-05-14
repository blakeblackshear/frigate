import { ReviewSegment } from "@/types/review";
import { Button } from "../ui/button";
import { LuRefreshCcw } from "react-icons/lu";
import { MutableRefObject, useMemo } from "react";

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
  const hasUpdate = useMemo(() => {
    if (!reviewItems || !itemsToReview) {
      return false;
    }

    return reviewItems.length < itemsToReview;
  }, [reviewItems, itemsToReview]);

  return (
    <div className={className}>
      <div className="pointer-events-auto mr-[65px] flex items-center justify-center md:mr-[115px]">
        <Button
          className={`${
            hasUpdate
              ? "duration-500 animate-in slide-in-from-top"
              : "invisible"
          }  mx-auto mt-5 bg-gray-400 text-center text-white`}
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
          New Items To Review
        </Button>
      </div>
    </div>
  );
}
