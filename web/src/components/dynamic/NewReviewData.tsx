import { useFrigateReviews } from "@/api/ws";
import { ReviewSeverity } from "@/types/review";
import { Button } from "../ui/button";
import { LuRefreshCcw } from "react-icons/lu";
import { MutableRefObject, useEffect, useMemo, useState } from "react";

type NewReviewDataProps = {
  className: string;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  severity: ReviewSeverity;
  pullLatestData: () => void;
};
export default function NewReviewData({
  className,
  contentRef,
  severity,
  pullLatestData,
}: NewReviewDataProps) {
  const { payload: review } = useFrigateReviews();

  const startCheckTs = useMemo(() => Date.now() / 1000, []);
  const [reviewTs, setReviewTs] = useState(startCheckTs);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    if (!review) {
      return;
    }

    if (review.type == "end" && review.review.severity == severity) {
      setReviewTs(review.review.start_time);
    }
  }, [review, severity]);

  useEffect(() => {
    if (reviewTs > startCheckTs) {
      setHasUpdate(true);
    }
  }, [startCheckTs, reviewTs]);

  return (
    <div className={className}>
      <div className="flex justify-center items-center md:mr-[100px]">
        <Button
          className={`${
            hasUpdate
              ? "animate-in slide-in-from-top duration-500"
              : "invisible"
          }  text-center mt-5 mx-auto bg-gray-400 text-white`}
          variant="secondary"
          onClick={() => {
            setHasUpdate(false);
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
