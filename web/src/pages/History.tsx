import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { FrigateConfig } from "@/types/frigateConfig";
import Heading from "@/components/ui/heading";
import ActivityIndicator from "@/components/ui/activity-indicator";
import axios from "axios";
import { getHourlyTimelineData } from "@/utils/historyUtil";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import HistoryFilterPopover from "@/components/filter/HistoryFilterPopover";
import useApiFilter from "@/hooks/use-api-filter";
import HistoryCardView from "@/views/history/HistoryCardView";
import HistoryTimelineView from "@/views/history/HistoryTimelineView";
import { Button } from "@/components/ui/button";
import { IoMdArrowBack } from "react-icons/io";
import useOverlayState from "@/hooks/use-overlay-state";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const API_LIMIT = 200;

function History() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const timezone = useMemo(
    () =>
      config?.ui?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    [config]
  );

  const [historyFilter, setHistoryFilter, historySearchParams] =
    useApiFilter<HistoryFilter>();

  const timelineFetcher = useCallback((key: any) => {
    const [path, params] = Array.isArray(key) ? key : [key, undefined];
    return axios.get(path, { params }).then((res) => res.data);
  }, []);

  const getKey = useCallback(
    (index: number, prevData: HourlyTimeline) => {
      if (index > 0) {
        const lastDate = prevData.end;
        const pagedParams =
          historySearchParams == undefined
            ? { before: lastDate, timezone, limit: API_LIMIT }
            : {
                ...historySearchParams,
                before: lastDate,
                timezone,
                limit: API_LIMIT,
              };
        return ["timeline/hourly", pagedParams];
      }

      const params =
        historySearchParams == undefined
          ? { timezone, limit: API_LIMIT }
          : { ...historySearchParams, timezone, limit: API_LIMIT };
      return ["timeline/hourly", params];
    },
    [historySearchParams]
  );

  const {
    data: timelinePages,
    mutate: updateHistory,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite<HourlyTimeline>(getKey, timelineFetcher);
  const { data: allPreviews } = useSWR<Preview[]>(
    timelinePages
      ? `preview/all/start/${timelinePages?.at(0)
          ?.start}/end/${timelinePages?.at(-1)?.end}`
      : null,
    { revalidateOnFocus: false }
  );

  const navigate = useNavigate();
  const [playback, setPlayback] = useState<TimelinePlayback | undefined>();
  const [viewingPlayback, setViewingPlayback] = useOverlayState("timeline");
  const setPlaybackState = useCallback(
    (playback: TimelinePlayback | undefined) => {
      if (playback == undefined) {
        setPlayback(undefined);
        navigate(-1);
      } else {
        setPlayback(playback);
        setViewingPlayback(true);
      }
    },
    [navigate]
  );

  const isMobile = useMemo(() => {
    return window.innerWidth < 768;
  }, [playback]);

  const timelineCards: CardsData | never[] = useMemo(() => {
    if (!timelinePages) {
      return [];
    }

    return getHourlyTimelineData(
      timelinePages,
      historyFilter?.detailLevel ?? "normal"
    );
  }, [historyFilter, timelinePages]);

  const isDone =
    (timelinePages?.[timelinePages.length - 1]?.count ?? 0) < API_LIMIT;

  const [itemsToDelete, setItemsToDelete] = useState<string[] | null>(null);
  const onDelete = useCallback(
    async (timeline: Card) => {
      if (timeline.entries.length > 1) {
        const uniqueEvents = new Set(
          timeline.entries.map((entry) => entry.source_id)
        );
        setItemsToDelete(new Array(...uniqueEvents));
      } else {
        const response = await axios.delete(
          `events/${timeline.entries[0].source_id}`
        );
        if (response.status === 200) {
          updateHistory();
        }
      }
    },
    [updateHistory]
  );
  const onDeleteMulti = useCallback(async () => {
    if (!itemsToDelete) {
      return;
    }

    const responses = itemsToDelete.map(async (id) => {
      return axios.delete(`events/${id}`);
    });

    if ((await responses[0]).status == 200) {
      updateHistory();
      setItemsToDelete(null);
    }
  }, [itemsToDelete, updateHistory]);

  if (!config || !timelineCards || timelineCards.length == 0) {
    return <ActivityIndicator />;
  }

  return (
    <>
      <div className="flex justify-between">
        <div className="flex justify-start">
          {viewingPlayback && (
            <Button
              className="mt-2"
              size="xs"
              variant="ghost"
              onClick={() => setPlaybackState(undefined)}
            >
              <IoMdArrowBack className="w-6 h-6" />
            </Button>
          )}
          <Heading as="h2">History</Heading>
        </div>
        {!playback && (
          <HistoryFilterPopover
            filter={historyFilter}
            onUpdateFilter={(filter) => setHistoryFilter(filter)}
          />
        )}
      </div>

      <AlertDialog
        open={itemsToDelete != null}
        onOpenChange={(_) => setItemsToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Delete ${itemsToDelete?.length} events?`}</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all events associated with these objects.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemsToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500"
              onClick={() => onDeleteMulti()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <HistoryCardView
        timelineCards={timelineCards}
        allPreviews={allPreviews}
        isMobile={isMobile}
        isValidating={isValidating}
        isDone={isDone}
        onNextPage={() => {
          setSize(size + 1);
        }}
        onDelete={onDelete}
        onItemSelected={(item) => setPlaybackState(item)}
      />
      <TimelineViewer
        playback={viewingPlayback ? playback : undefined}
        isMobile={isMobile}
        onClose={() => setPlaybackState(undefined)}
      />
    </>
  );
}

type TimelineViewerProps = {
  playback: TimelinePlayback | undefined;
  isMobile: boolean;
  onClose: () => void;
};

function TimelineViewer({ playback, isMobile, onClose }: TimelineViewerProps) {
  if (isMobile) {
    return playback != undefined ? (
      <div className="w-screen absolute left-0 top-20 bottom-0 bg-background z-50">
        <HistoryTimelineView playback={playback} isMobile={isMobile} />
      </div>
    ) : null;
  }

  return (
    <Dialog open={playback != undefined} onOpenChange={(_) => onClose()}>
      <DialogContent className="w-3/5 max-w-full">
        {playback && (
          <HistoryTimelineView playback={playback} isMobile={isMobile} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default History;
