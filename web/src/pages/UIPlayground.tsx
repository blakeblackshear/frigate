import { useCallback, useMemo, useRef, useState } from "react";
import Heading from "@/components/ui/heading";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import EventReviewTimeline from "@/components/timeline/EventReviewTimeline";
import {
  MotionData,
  ReviewData,
  ReviewSegment,
  ReviewSeverity,
  ZoomLevel,
} from "@/types/review";
import { Button } from "@/components/ui/button";
import CameraActivityIndicator from "@/components/indicators/CameraActivityIndicator";
import MotionReviewTimeline from "@/components/timeline/MotionReviewTimeline";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BirdseyeLivePlayer from "@/components/player/BirdseyeLivePlayer";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import SummaryTimeline from "@/components/timeline/SummaryTimeline";
import { isMobile } from "react-device-detect";
import IconPicker, { IconElement } from "@/components/icons/IconPicker";
import { useTimelineZoom } from "@/hooks/use-timeline-zoom";
import ObjectPathPlotter from "@/components/overlay/detail/ObjectPathPlotter";

// Color data
const colors = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
];

function ColorSwatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="mb-2 flex items-center">
      <div
        className="mr-2 h-10 w-10 border border-gray-300"
        style={{ backgroundColor: value }}
      ></div>
      <span>{name}</span>
    </div>
  );
}

function generateRandomMotionAudioData(): MotionData[] {
  const now = new Date();
  const endTime = now.getTime() / 1000;
  const startTime = endTime - 24 * 60 * 60; // 24 hours ago
  const interval = 30; // 30 seconds

  const data = [];
  for (
    let startTimestamp = startTime;
    startTimestamp < endTime;
    startTimestamp += interval
  ) {
    const motion = Math.floor(Math.random() * 101); // Random number between 0 and 100
    const audio = Math.random() * -100; // Random negative value between -100 and 0
    const camera = "test_camera";
    data.push({
      start_time: startTimestamp,
      motion,
      audio,
      camera,
    });
  }

  return data;
}

const generateRandomEvent = (): ReviewSegment => {
  const start_time =
    Math.floor(Date.now() / 1000) - 60 * 30 - Math.random() * 60 * 60;
  const end_time = Math.floor(start_time + Math.random() * 60 * 10);
  const severities: ReviewSeverity[] = [
    "significant_motion",
    "detection",
    "alert",
  ];
  const severity = severities[Math.floor(Math.random() * severities.length)];
  const has_been_reviewed = Math.random() < 0.2;
  const id = new Date(start_time * 1000).toISOString(); // Date string as mock ID

  // You need to provide values for camera, thumb_path, and data
  const camera = "CameraXYZ";
  const thumb_path = "/path/to/thumb";
  const data: ReviewData = {
    audio: [],
    detections: [],
    objects: [],
    significant_motion_areas: [],
    zones: [],
  };

  return {
    id,
    start_time,
    end_time,
    severity,
    has_been_reviewed,
    camera,
    thumb_path,
    data,
  };
};

function UIPlayground() {
  const { data: config } = useSWR<FrigateConfig>("config");
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reviewTimelineRef = useRef<HTMLDivElement>(null);
  const [mockEvents, setMockEvents] = useState<ReviewSegment[]>([]);
  const [mockMotionData, setMockMotionData] = useState<MotionData[]>([]);
  const [handlebarTime, setHandlebarTime] = useState(
    Math.round((Date.now() / 1000 - 15 * 60) / 60) * 60,
  );

  const [exportStartTime, setExportStartTime] = useState(
    Math.round((Date.now() / 1000 - 45 * 60) / 60) * 60,
  );

  const [exportEndTime, setExportEndTime] = useState(
    Math.round((Date.now() / 1000 - 43 * 60) / 60) * 60,
  );

  const [showExportHandles, setShowExportHandles] = useState(false);

  const navigate = useNavigate();

  useMemo(() => {
    const initialEvents = Array.from({ length: 10 }, generateRandomEvent);
    setMockEvents(initialEvents);
    setMockMotionData(generateRandomMotionAudioData());
  }, []);

  // Calculate minimap start and end times based on events
  const minimapStartTime = useMemo(() => {
    if (mockEvents && mockEvents.length > 0) {
      return Math.min(...mockEvents.map((event) => event.start_time));
    }
    return Math.floor(Date.now() / 1000); // Default to current time if no events
  }, [mockEvents]);

  const minimapEndTime = useMemo(() => {
    if (mockEvents && mockEvents.length > 0) {
      return Math.max(
        ...mockEvents.map((event) => event.end_time ?? event.start_time),
      );
    }
    return Math.floor(Date.now() / 1000); // Default to current time if no events
  }, [mockEvents]);

  const [zoomSettings, setZoomSettings] = useState({
    segmentDuration: 60,
    timestampSpread: 15,
  });

  const possibleZoomLevels: ZoomLevel[] = useMemo(
    () => [
      { segmentDuration: 60, timestampSpread: 15 },
      { segmentDuration: 30, timestampSpread: 5 },
      { segmentDuration: 10, timestampSpread: 1 },
    ],
    [],
  );

  const handleZoomChange = useCallback(
    (newZoomLevel: number) => {
      setZoomSettings(possibleZoomLevels[newZoomLevel]);
    },
    [possibleZoomLevels],
  );

  const currentZoomLevel = useMemo(
    () =>
      possibleZoomLevels.findIndex(
        (level) => level.segmentDuration === zoomSettings.segmentDuration,
      ),
    [possibleZoomLevels, zoomSettings.segmentDuration],
  );

  const { zoomLevel, handleZoom, isZooming, zoomDirection } = useTimelineZoom({
    zoomSettings,
    zoomLevels: possibleZoomLevels,
    onZoomChange: handleZoomChange,
    timelineRef: reviewTimelineRef,
    timelineDuration: 4 * 60 * 60,
  });

  const handleZoomIn = () => handleZoom(-1);
  const handleZoomOut = () => handleZoom(1);

  const [isDragging, setIsDragging] = useState(false);

  const handleDraggingChange = (dragging: boolean) => {
    setIsDragging(dragging);
  };

  const [isEventsReviewTimeline, setIsEventsReviewTimeline] = useState(true);
  const birdseyeConfig = config?.birdseye;

  const [selectedIcon, setSelectedIcon] = useState<IconElement>();

  return (
    <>
      <div className="h-full w-full">
        <div className="flex h-full">
          <div className="no-scrollbar mr-5 mt-4 flex-1 content-start gap-2 overflow-y-auto">
            <Heading as="h2">UI Playground</Heading>

            <ObjectPathPlotter />

            <IconPicker
              selectedIcon={selectedIcon}
              setSelectedIcon={setSelectedIcon}
            />

            {selectedIcon?.name && (
              <p>Selected icon name: {selectedIcon.name}</p>
            )}

            <Heading as="h4" className="my-5">
              Scrubber
            </Heading>
            <p className="text-small">
              Shows the 10 most recent events within the last 4 hours
            </p>

            {!config && <ActivityIndicator />}

            <div ref={contentRef}>
              <Heading as="h4" className="my-5">
                Timeline
              </Heading>
              <p className="text-small">
                Handlebar timestamp: {handlebarTime} -&nbsp;
                {new Date(handlebarTime * 1000).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                  day: "2-digit",
                  second: "2-digit",
                })}
              </p>
              <p className="text-small">
                Handlebar is dragging: {isDragging ? "yes" : "no"}
              </p>
              <p className="text-small">
                Export start timestamp: {exportStartTime} -&nbsp;
                {new Date(exportStartTime * 1000).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                  day: "2-digit",
                  second: "2-digit",
                })}
              </p>
              <p className="text-small">
                Export end timestamp: {exportEndTime} -&nbsp;
                {new Date(exportEndTime * 1000).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                  day: "2-digit",
                  second: "2-digit",
                })}
              </p>
              <div className="my-4">
                <Heading as="h4">Timeline type</Heading>
                <Select
                  defaultValue={isEventsReviewTimeline ? "event" : "motion"}
                  onValueChange={(checked) => {
                    setIsEventsReviewTimeline(checked == "event");
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Timeline Type</SelectLabel>
                      <SelectItem value="event">Event Review</SelectItem>
                      <SelectItem value="motion">
                        Motion/Audio Review
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-start p-2">
                <Switch
                  id="exporthandles"
                  checked={showExportHandles}
                  onCheckedChange={() => {
                    setShowExportHandles(!showExportHandles);
                    if (showExportHandles) {
                      setExportEndTime(
                        Math.round((Date.now() / 1000 - 43 * 60) / 60) * 60,
                      );
                      setExportStartTime(
                        Math.round((Date.now() / 1000 - 45 * 60) / 60) * 60,
                      );
                    }
                  }}
                />
                <Label className="ml-2" htmlFor="exporthandles">
                  Show Export Handles
                </Label>
              </div>
              <div>
                <Button
                  onClick={() => {
                    navigate("/export", {
                      state: { start: exportStartTime, end: exportEndTime },
                    });
                  }}
                  disabled={!showExportHandles}
                >
                  Export
                </Button>
              </div>
              <div className="my-4 w-[40px]">
                <CameraActivityIndicator />
              </div>
              zoom level: {zoomLevel}
              <p>
                <Button
                  variant="default"
                  onClick={handleZoomOut}
                  disabled={zoomLevel === 0}
                >
                  Zoom Out
                </Button>
                <Button
                  onClick={handleZoomIn}
                  disabled={zoomLevel === possibleZoomLevels.length - 1}
                >
                  Zoom In
                </Button>
              </p>
              <div ref={containerRef} className="">
                {birdseyeConfig && (
                  <BirdseyeLivePlayer
                    birdseyeConfig={birdseyeConfig}
                    liveMode={birdseyeConfig.restream ? "mse" : "jsmpeg"}
                    containerRef={containerRef}
                  />
                )}
              </div>
              <Heading as="h4" className="my-5">
                Color scheme
              </Heading>
              <p className="text-small">
                Colors as set by the current theme. See the{" "}
                <a
                  className="underline"
                  href="https://ui.shadcn.com/docs/theming"
                >
                  shadcn theming docs
                </a>{" "}
                for usage.
              </p>
              <div className="my-5">
                {colors.map((color, index) => (
                  <ColorSwatch
                    key={index}
                    name={color}
                    value={`hsl(var(--${color}))`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="no-scrollbar w-[55px] overflow-y-auto md:w-[100px]">
            {!isEventsReviewTimeline && (
              <MotionReviewTimeline
                segmentDuration={zoomSettings.segmentDuration} // seconds per segment
                timestampSpread={zoomSettings.timestampSpread} // minutes between each major timestamp
                timelineStart={Math.floor(Date.now() / 1000)} // timestamp start of the timeline - the earlier time
                timelineEnd={Math.floor(Date.now() / 1000) - 4 * 60 * 60} // end of timeline - the later time
                showHandlebar // show / hide the handlebar
                handlebarTime={handlebarTime} // set the time of the handlebar
                setHandlebarTime={setHandlebarTime} // expose handler to set the handlebar time
                onHandlebarDraggingChange={handleDraggingChange} // function for state of handlebar dragging
                showMinimap={false} // show / hide the minimap
                minimapStartTime={minimapStartTime} // start time of the minimap - the earlier time (eg 1:00pm)
                minimapEndTime={minimapEndTime} // end of the minimap - the later time (eg 3:00pm)
                showExportHandles={showExportHandles}
                exportStartTime={exportStartTime}
                setExportStartTime={setExportStartTime}
                exportEndTime={exportEndTime}
                setExportEndTime={setExportEndTime}
                events={mockEvents} // events, including new has_been_reviewed and severity properties
                motion_events={mockMotionData}
                contentRef={contentRef} // optional content ref where previews are, can be used for observing/scrolling later
                dense={isMobile} // dense will produce a smaller handlebar and only minute resolution on timestamps
                isZooming={isZooming} // is the timeline actively zooming?
                zoomDirection={zoomDirection} // is the timeline zooming in or out
                onZoomChange={handleZoomChange}
                possibleZoomLevels={possibleZoomLevels}
                currentZoomLevel={currentZoomLevel}
              />
            )}
            {isEventsReviewTimeline && (
              <EventReviewTimeline
                segmentDuration={zoomSettings.segmentDuration} // seconds per segment
                timestampSpread={zoomSettings.timestampSpread} // minutes between each major timestamp
                timelineStart={Math.floor(Date.now() / 1000)} // timestamp start of the timeline - the earlier time
                timelineEnd={Math.floor(Date.now() / 1000) - 4 * 60 * 60} // end of timeline - the later time
                showHandlebar // show / hide the handlebar
                handlebarTime={handlebarTime} // set the time of the handlebar
                setHandlebarTime={setHandlebarTime} // expose handler to set the handlebar time
                onHandlebarDraggingChange={handleDraggingChange} // function for state of handlebar dragging
                showMinimap // show / hide the minimap
                minimapStartTime={minimapStartTime} // start time of the minimap - the earlier time (eg 1:00pm)
                minimapEndTime={minimapEndTime} // end of the minimap - the later time (eg 3:00pm)
                showExportHandles={showExportHandles}
                exportStartTime={exportStartTime}
                setExportStartTime={setExportStartTime}
                exportEndTime={exportEndTime}
                setExportEndTime={setExportEndTime}
                events={mockEvents} // events, including new has_been_reviewed and severity properties
                severityType={"alert"} // choose the severity type for the middle line - all other severity types are to the right
                contentRef={contentRef} // optional content ref where previews are, can be used for observing/scrolling later
                timelineRef={reviewTimelineRef} // save a ref to this timeline to connect with the summary timeline
                dense // dense will produce a smaller handlebar and only minute resolution on timestamps
                isZooming={isZooming} // is the timeline actively zooming?
                zoomDirection={zoomDirection} // is the timeline zooming in or out
                onZoomChange={handleZoomChange}
                possibleZoomLevels={possibleZoomLevels}
                currentZoomLevel={currentZoomLevel}
              />
            )}
          </div>
          {isEventsReviewTimeline && (
            <div className="w-[10px]">
              <SummaryTimeline
                reviewTimelineRef={reviewTimelineRef} // the ref to the review timeline
                timelineStart={Math.floor(Date.now() / 1000)} // timestamp start of the timeline - the earlier time
                timelineEnd={Math.floor(Date.now() / 1000) - 4 * 60 * 60} // end of timeline - the later time
                segmentDuration={zoomSettings.segmentDuration}
                events={mockEvents}
                severityType={"alert"} // show only events of this severity on the summary timeline
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default UIPlayground;
