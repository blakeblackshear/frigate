import { useMemo, useEffect, useRef } from "react";
import { ObjectLifecycleSequence } from "@/types/timeline";
import { LifecycleIcon } from "@/components/overlay/detail/ObjectLifecycle";
import { getLifecycleItemDescription } from "@/utils/lifecycleUtil";
import { useActivityStream } from "@/contexts/ActivityStreamContext";
import scrollIntoView from "scroll-into-view-if-needed";
import useUserInteraction from "@/hooks/use-user-interaction";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { useTranslation } from "react-i18next";
import { FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import ActivityIndicator from "../indicators/activity-indicator";

type ActivityStreamProps = {
  timelineData: ObjectLifecycleSequence[];
  currentTime: number;
  onSeek: (timestamp: number) => void;
};

export default function ActivityStream({
  timelineData,
  currentTime,
  onSeek,
}: ActivityStreamProps) {
  const { data: config } = useSWR<FrigateConfig>("config");
  const { t } = useTranslation("views/events");
  const { selectedObjectId, annotationOffset } = useActivityStream();
  const scrollRef = useRef<HTMLDivElement>(null);

  const effectiveTime = currentTime + annotationOffset;

  // Track user interaction and adjust scrolling behavior
  const { userInteracting, setProgrammaticScroll } = useUserInteraction({
    elementRef: scrollRef,
  });

  // group activities by timestamp (within 1 second resolution window)
  const groupedActivities = useMemo(() => {
    const groups: { [key: number]: ObjectLifecycleSequence[] } = {};

    timelineData.forEach((activity) => {
      const groupKey = Math.floor(activity.timestamp);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(activity);
    });

    return Object.entries(groups)
      .map(([_timestamp, activities]) => {
        const sortedActivities = activities.sort(
          (a, b) => a.timestamp - b.timestamp,
        );
        return {
          timestamp: sortedActivities[0].timestamp, // Original timestamp for display
          effectiveTimestamp: sortedActivities[0].timestamp + annotationOffset, // Adjusted for sorting/comparison
          activities: sortedActivities,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [timelineData, annotationOffset]);

  // Filter activities if object is selected
  const filteredGroups = useMemo(() => {
    if (!selectedObjectId) {
      return groupedActivities;
    }
    return groupedActivities
      .map((group) => ({
        ...group,
        activities: group.activities.filter(
          (activity) => activity.source_id === selectedObjectId,
        ),
      }))
      .filter((group) => group.activities.length > 0);
  }, [groupedActivities, selectedObjectId]);

  // Auto-scroll to current time
  useEffect(() => {
    if (!scrollRef.current || userInteracting) return;

    // Find the last group where effectiveTimestamp <= currentTime + annotationOffset
    let currentGroupIndex = -1;
    for (let i = filteredGroups.length - 1; i >= 0; i--) {
      if (filteredGroups[i].effectiveTimestamp <= effectiveTime) {
        currentGroupIndex = i;
        break;
      }
    }

    if (currentGroupIndex !== -1) {
      const element = scrollRef.current.querySelector(
        `[data-timestamp="${filteredGroups[currentGroupIndex].timestamp}"]`,
      ) as HTMLElement;
      if (element) {
        setProgrammaticScroll();
        scrollIntoView(element, {
          scrollMode: "if-needed",
          behavior: "smooth",
        });
      }
    }
  }, [
    filteredGroups,
    effectiveTime,
    annotationOffset,
    userInteracting,
    setProgrammaticScroll,
  ]);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div
      ref={scrollRef}
      className="scrollbar-container h-full overflow-y-auto bg-secondary"
    >
      <div className="space-y-2 p-4">
        {filteredGroups.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {t("activity.noActivitiesFound")}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <ActivityGroup
              key={group.timestamp}
              group={group}
              config={config}
              isCurrent={group.effectiveTimestamp <= currentTime}
              onSeek={onSeek}
            />
          ))
        )}
      </div>
    </div>
  );
}

type ActivityGroupProps = {
  group: {
    timestamp: number;
    effectiveTimestamp: number;
    activities: ObjectLifecycleSequence[];
  };
  config: FrigateConfig;
  isCurrent: boolean;
  onSeek: (timestamp: number) => void;
};

function ActivityGroup({
  group,
  config,
  isCurrent,
  onSeek,
}: ActivityGroupProps) {
  const { t } = useTranslation("views/events");
  const shouldExpand = group.activities.length > 1;

  return (
    <div
      data-timestamp={group.timestamp}
      className={`cursor-pointer rounded-lg border p-3 transition-colors ${
        isCurrent
          ? "border-primary/20 bg-primary/10"
          : "border-border bg-background hover:bg-muted/50"
      }`}
      onClick={() => onSeek(group.timestamp)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">
            {formatUnixTimestampToDateTime(group.timestamp, {
              timezone: config.ui.timezone,
              date_format:
                config.ui.time_format == "24hour"
                  ? t("time.formattedTimestamp.24hour", {
                      ns: "common",
                    })
                  : t("time.formattedTimestamp.12hour", {
                      ns: "common",
                    }),
              time_style: "medium",
              date_style: "medium",
            })}
          </div>
          {shouldExpand && (
            <div className="text-xs text-muted-foreground">
              {t("activity.activitiesCount", {
                count: group.activities.length,
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {group.activities.map((activity, index) => (
          <ActivityItem key={index} activity={activity} onSeek={onSeek} />
        ))}
      </div>
    </div>
  );
}

type ActivityItemProps = {
  activity: ObjectLifecycleSequence;
  onSeek: (timestamp: number) => void;
};

function ActivityItem({ activity }: ActivityItemProps) {
  const { t } = useTranslation("views/events");
  const { selectedObjectId, setSelectedObjectId } = useActivityStream();
  const handleObjectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedObjectId === activity.source_id) {
      setSelectedObjectId(undefined);
    } else {
      setSelectedObjectId(activity.source_id);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex h-4 w-4 items-center justify-center rounded bg-muted">
        <LifecycleIcon lifecycleItem={activity} className="h-3 w-3" />
      </div>
      <div className="flex-1">{getLifecycleItemDescription(activity)}</div>
      {activity.source_id && (
        <button
          onClick={handleObjectClick}
          className={`rounded px-2 py-1 text-xs ${
            selectedObjectId === activity.source_id
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          {t("activity.object")}
        </button>
      )}
    </div>
  );
}
