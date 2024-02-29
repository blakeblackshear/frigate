import { LuCheckSquare, LuTrash, LuX } from "react-icons/lu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useCallback } from "react";
import axios from "axios";

type ReviewActionGroupProps = {
  selectedReviews: string[];
  setSelectedReviews: (ids: string[]) => void;
  pullLatestData: () => void;
};
export default function ReviewActionGroup({
  selectedReviews,
  setSelectedReviews,
  pullLatestData,
}: ReviewActionGroupProps) {
  const onClearSelected = useCallback(() => {
    setSelectedReviews([]);
  }, [setSelectedReviews]);

  const onMarkAsReviewed = useCallback(async () => {
    const idList = selectedReviews.join(",");
    await axios.post(`reviews/${idList}/viewed`);
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
    <div className="absolute inset-x-2 md:inset-x-[40%] top-0 p-2 bg-primary-foreground md:border-2 md:rounded-lg flex justify-between items-center">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-pointer" onClick={onClearSelected}>
              <LuX />
            </div>
          </TooltipTrigger>
          <TooltipContent>Unselect All</TooltipContent>
        </Tooltip>
        <div className="flex gap-2 items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-pointer" onClick={onMarkAsReviewed}>
                <LuCheckSquare />
              </div>
            </TooltipTrigger>
            <TooltipContent>Mark Selected As Reviewed</TooltipContent>
          </Tooltip>
          <div className="text-sm font-thin">|</div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-pointer" onClick={onDelete}>
                <LuTrash />
              </div>
            </TooltipTrigger>
            <TooltipContent>Delete Selected</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
