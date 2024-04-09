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
      <div className="flex justify-center items-center mr-[65px] md:mr-[115px] pointer-events-auto">
        <Button
          className={`${
            hasUpdate
              ? "animate-in slide-in-from-top duration-500"
              : "invisible"
          }  text-center mt-5 mx-auto bg-gray-400 text-white`}
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
          <LuRefreshCcw className="w-4 h-4 mr-2" />
          New Items To Review
        </Button>
      </div>
    </div>
  );
}
