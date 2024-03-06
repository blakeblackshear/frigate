import { LuCheckSquare, LuFileUp, LuTrash } from "react-icons/lu";
import { useCallback } from "react";
import axios from "axios";
import { Button } from "../ui/button";
import { isDesktop } from "react-device-detect";

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
    const idList = selectedReviews.join(",");
    await axios.post(`reviews/viewed`, { ids: idList });
    setSelectedReviews([]);
    pullLatestData();
  }, [selectedReviews, setSelectedReviews, pullLatestData]);

  const onDelete = useCallback(async () => {
    const idList = selectedReviews.join(",");
    await axios.delete(`reviews/${idList}`);
    setSelectedReviews([]);
    pullLatestData();
  }, [selectedReviews, setSelectedReviews, pullLatestData]);

  return (
    <div className="absolute inset-x-2 inset-y-0 md:left-auto md:right-2 p-2 flex gap-2 justify-between items-center bg-background">
      <div className="flex items-center">
        <div className="text-sm text-gray-500 mr-2">{`${selectedReviews.length} selected | `}</div>
        <Button size="xs" variant="link" onClick={onClearSelected}>
          Unselect
        </Button>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        {selectedReviews.length == 1 && (
          <Button
            className="flex items-center"
            variant="secondary"
            size="sm"
            onClick={() => {
              onExport(selectedReviews[0]);
              onClearSelected();
            }}
          >
            <LuFileUp className="mr-1" />
            {isDesktop && "Export"}
          </Button>
        )}
        <Button
          className="flex items-center"
          variant="secondary"
          size="sm"
          onClick={onMarkAsReviewed}
        >
          <LuCheckSquare className="mr-1" />
          {isDesktop && "Mark as reviewed"}
        </Button>
        <Button
          className="flex items-center"
          variant="secondary"
          size="sm"
          onClick={onDelete}
        >
          <LuTrash className="mr-1" />
          {isDesktop && "Delete"}
        </Button>
      </div>
    </div>
  );
}
