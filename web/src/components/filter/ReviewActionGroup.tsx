import { FaCircleCheck } from "react-icons/fa6";
import { useCallback } from "react";
import axios from "axios";
import { Button } from "../ui/button";
import { isDesktop } from "react-device-detect";
import { FaCompactDisc } from "react-icons/fa";
import { HiTrash } from "react-icons/hi";

type ReviewActionGroupProps = {
  selectedReviews: string[];
  setSelectedReviews: (ids: string[]) => void;
  onExport: (id: string) => void;
  pullLatestData: () => void;
};
export default function ReviewActionGroup({
  selectedReviews,
  setSelectedReviews,
  onExport,
  pullLatestData,
}: ReviewActionGroupProps) {
  const onClearSelected = useCallback(() => {
    setSelectedReviews([]);
  }, [setSelectedReviews]);

  const onMarkAsReviewed = useCallback(async () => {
    await axios.post(`reviews/viewed`, { ids: selectedReviews });
    setSelectedReviews([]);
    pullLatestData();
  }, [selectedReviews, setSelectedReviews, pullLatestData]);

  const onDelete = useCallback(async () => {
    await axios.post(`reviews/delete`, { ids: selectedReviews });
    setSelectedReviews([]);
    pullLatestData();
  }, [selectedReviews, setSelectedReviews, pullLatestData]);

  return (
    <div className="absolute inset-x-2 inset-y-0 flex items-center justify-between gap-2 bg-background py-2 md:left-auto">
      <div className="mx-1 flex items-center justify-center text-sm text-muted-foreground">
        <div className="p-1">{`${selectedReviews.length} selected`}</div>
        <div className="p-1">{"|"}</div>
        <div
          className="cursor-pointer p-2 text-primary hover:rounded-lg hover:bg-secondary"
          onClick={onClearSelected}
        >
          Unselect
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        {selectedReviews.length == 1 && (
          <Button
            className="flex items-center gap-2 p-2"
            size="sm"
            onClick={() => {
              onExport(selectedReviews[0]);
              onClearSelected();
            }}
          >
            <FaCompactDisc className="text-secondary-foreground" />
            {isDesktop && <div className="text-primary">Export</div>}
          </Button>
        )}
        <Button
          className="flex items-center gap-2 p-2"
          size="sm"
          onClick={onMarkAsReviewed}
        >
          <FaCircleCheck className="text-secondary-foreground" />
          {isDesktop && <div className="text-primary">Mark as reviewed</div>}
        </Button>
        <Button
          className="flex items-center gap-2 p-2"
          size="sm"
          onClick={onDelete}
        >
          <HiTrash className="text-secondary-foreground" />
          {isDesktop && <div className="text-primary">Delete</div>}
        </Button>
      </div>
    </div>
  );
}
