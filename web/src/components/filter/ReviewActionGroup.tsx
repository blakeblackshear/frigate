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
    <div className="absolute inset-x-2 inset-y-0 md:left-auto py-2 flex gap-2 justify-between items-center bg-background">
      <div className="mx-1 flex justify-center items-center text-sm text-muted-foreground">
        <div className="p-1">{`${selectedReviews.length} selected`}</div>
        <div className="p-1">{"|"}</div>
        <div
          className="p-2 text-primary-foreground cursor-pointer hover:bg-secondary hover:rounded-lg"
          onClick={onClearSelected}
        >
          Unselect
        </div>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        {selectedReviews.length == 1 && (
          <Button
            className="p-2 flex items-center gap-2"
            variant="secondary"
            size="sm"
            onClick={() => {
              onExport(selectedReviews[0]);
              onClearSelected();
            }}
          >
            <FaCompactDisc />
            {isDesktop && <div className="text-primary-foreground">Export</div>}
          </Button>
        )}
        <Button
          className="p-2 flex items-center gap-2"
          variant="secondary"
          size="sm"
          onClick={onMarkAsReviewed}
        >
          <FaCircleCheck />
          {isDesktop && (
            <div className="text-primary-foreground">Mark as reviewed</div>
          )}
        </Button>
        <Button
          className="p-2 flex items-center gap-1"
          variant="secondary"
          size="sm"
          onClick={onDelete}
        >
          <HiTrash />
          {isDesktop && <div className="text-primary-foreground">Delete</div>}
        </Button>
      </div>
    </div>
  );
}
