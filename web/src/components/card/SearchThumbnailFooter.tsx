import { useCallback, useState } from "react";
import TimeAgo from "../dynamic/TimeAgo";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { useFormattedTimestamp } from "@/hooks/use-date-utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ActivityIndicator from "../indicators/activity-indicator";
import { SearchResult } from "@/types/search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { LuCamera, LuDownload, LuMoreVertical, LuTrash2 } from "react-icons/lu";
import FrigatePlusIcon from "@/components/icons/FrigatePlusIcon";
import { FrigatePlusDialog } from "../overlay/dialog/FrigatePlusDialog";
import { Event } from "@/types/event";
import { FaArrowsRotate } from "react-icons/fa6";
import { baseUrl } from "@/api/baseUrl";
import axios from "axios";
import { toast } from "sonner";
import { MdImageSearch } from "react-icons/md";
import { isMobileOnly } from "react-device-detect";

type SearchThumbnailProps = {
  searchResult: SearchResult;
  findSimilar: () => void;
  refreshResults: () => void;
  showObjectLifecycle: () => void;
};

export default function SearchThumbnailFooter({
  searchResult,
  findSimilar,
  refreshResults,
  showObjectLifecycle,
}: SearchThumbnailProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // interactions

  const [showFrigatePlus, setShowFrigatePlus] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = useCallback(() => {
    axios
      .delete(`events/${searchResult.id}`)
      .then((resp) => {
        if (resp.status == 200) {
          toast.success("Tracked object deleted successfully.", {
            position: "top-center",
          });
          refreshResults();
        }
      })
      .catch(() => {
        toast.error("Failed to delete tracked object.", {
          position: "top-center",
        });
      });
  }, [searchResult, refreshResults]);

  // date

  const formattedDate = useFormattedTimestamp(
    searchResult.start_time,
    config?.ui.time_format == "24hour" ? "%b %-d, %H:%M" : "%b %-d, %I:%M %p",
    config?.ui.timezone,
  );

  return (
    <>
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            Are you sure you want to delete this tracked object?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <FrigatePlusDialog
        upload={
          showFrigatePlus ? (searchResult as unknown as Event) : undefined
        }
        onClose={() => setShowFrigatePlus(false)}
        onEventUploaded={() => {
          searchResult.plus_id = "submitted";
        }}
      />

      <div className="flex flex-col items-start text-xs text-primary-variant">
        {searchResult.end_time ? (
          <TimeAgo time={searchResult.start_time * 1000} dense />
        ) : (
          <div>
            <ActivityIndicator size={24} />
          </div>
        )}
        {formattedDate}
      </div>
      <div className="flex flex-row items-center justify-end gap-6 md:gap-4">
        {!isMobileOnly &&
          config?.plus?.enabled &&
          searchResult.has_snapshot &&
          searchResult.end_time &&
          !searchResult.plus_id && (
            <Tooltip>
              <TooltipTrigger>
                <FrigatePlusIcon
                  className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                  onClick={() => setShowFrigatePlus(true)}
                />
              </TooltipTrigger>
              <TooltipContent>Submit to Frigate+</TooltipContent>
            </Tooltip>
          )}

        {config?.semantic_search?.enabled && (
          <Tooltip>
            <TooltipTrigger>
              <MdImageSearch
                className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                onClick={findSimilar}
              />
            </TooltipTrigger>
            <TooltipContent>Find similar</TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger>
            <LuMoreVertical className="size-5 cursor-pointer text-primary-variant hover:text-primary" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align={"end"}>
            {searchResult.has_clip && (
              <DropdownMenuItem>
                <a
                  className="justify_start flex items-center"
                  href={`${baseUrl}api/events/${searchResult.id}/clip.mp4`}
                  download={`${searchResult.camera}_${searchResult.label}.mp4`}
                >
                  <LuDownload className="mr-2 size-4" />
                  <span>Download video</span>
                </a>
              </DropdownMenuItem>
            )}
            {searchResult.has_snapshot && (
              <DropdownMenuItem>
                <a
                  className="justify_start flex items-center"
                  href={`${baseUrl}api/events/${searchResult.id}/snapshot.jpg`}
                  download={`${searchResult.camera}_${searchResult.label}.jpg`}
                >
                  <LuCamera className="mr-2 size-4" />
                  <span>Download snapshot</span>
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={showObjectLifecycle}
            >
              <FaArrowsRotate className="mr-2 size-4" />
              <span>View object lifecycle</span>
            </DropdownMenuItem>

            {isMobileOnly &&
              config?.plus?.enabled &&
              searchResult.has_snapshot &&
              searchResult.end_time &&
              !searchResult.plus_id && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => setShowFrigatePlus(true)}
                >
                  <FrigatePlusIcon className="mr-2 size-4 cursor-pointer text-primary" />
                  <span>Submit to Frigate+</span>
                </DropdownMenuItem>
              )}
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <LuTrash2 className="mr-2 size-4" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
