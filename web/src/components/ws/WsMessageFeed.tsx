import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { WsFeedMessage } from "@/api/ws";
import { useWsMessageBuffer } from "@/hooks/use-ws-message-buffer";
import WsMessageRow from "./WsMessageRow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FaEraser, FaFilter, FaPause, FaPlay, FaVideo } from "react-icons/fa";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import FilterSwitch from "@/components/filter/FilterSwitch";
import { isMobile } from "react-device-detect";
import { isReplayCamera } from "@/utils/cameraUtil";

type TopicCategory =
  | "events"
  | "camera_activity"
  | "system"
  | "reviews"
  | "classification"
  | "face_recognition"
  | "lpr";

const ALL_TOPIC_CATEGORIES: TopicCategory[] = [
  "events",
  "reviews",
  "classification",
  "face_recognition",
  "lpr",
  "camera_activity",
  "system",
];

const PRESET_TOPICS: Record<TopicCategory, Set<string>> = {
  events: new Set(["events", "triggers"]),
  reviews: new Set(["reviews"]),
  classification: new Set(["tracked_object_update"]),
  face_recognition: new Set(["tracked_object_update"]),
  lpr: new Set(["tracked_object_update"]),
  camera_activity: new Set(["camera_activity", "audio_detections"]),
  system: new Set([
    "stats",
    "model_state",
    "job_state",
    "embeddings_reindex_progress",
    "audio_transcription_state",
    "birdseye_layout",
  ]),
};

// Maps tracked_object_update payload type to TopicCategory
const TRACKED_UPDATE_TYPE_MAP: Record<string, TopicCategory> = {
  classification: "classification",
  face: "face_recognition",
  lpr: "lpr",
};

// camera_activity preset also matches topics with camera prefix patterns
const CAMERA_ACTIVITY_TOPIC_PATTERNS = [
  "/motion",
  "/audio",
  "/detect",
  "/recordings",
  "/enabled",
  "/snapshots",
  "/ptz",
];

function matchesCategories(
  msg: WsFeedMessage,
  categories: TopicCategory[] | undefined,
): boolean {
  // undefined means all topics
  if (!categories) return true;

  const { topic, payload } = msg;

  // Handle tracked_object_update with payload-based sub-categories
  if (topic === "tracked_object_update") {
    // payload might be a JSON string or a parsed object
    let data: unknown = payload;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        // not valid JSON, fall through
      }
    }

    const updateType =
      data && typeof data === "object" && "type" in data
        ? (data as { type: string }).type
        : undefined;

    if (updateType && updateType in TRACKED_UPDATE_TYPE_MAP) {
      const mappedCategory = TRACKED_UPDATE_TYPE_MAP[updateType];
      return categories.includes(mappedCategory);
    }

    // tracked_object_update with other types (e.g. "description") falls under "events"
    return categories.includes("events");
  }

  for (const cat of categories) {
    const topicSet = PRESET_TOPICS[cat];
    if (topicSet.has(topic)) return true;

    if (cat === "camera_activity") {
      if (
        CAMERA_ACTIVITY_TOPIC_PATTERNS.some((pattern) =>
          topic.includes(pattern),
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

type WsMessageFeedProps = {
  maxSize?: number;
  defaultCamera?: string;
  lockedCamera?: string;
  showCameraBadge?: boolean;
};

export default function WsMessageFeed({
  maxSize = 500,
  defaultCamera,
  lockedCamera,
  showCameraBadge = true,
}: WsMessageFeedProps) {
  const { t } = useTranslation(["views/system"]);
  const [paused, setPaused] = useState(false);
  // undefined = all topics
  const [selectedTopics, setSelectedTopics] = useState<
    TopicCategory[] | undefined
  >(undefined);
  // undefined = all cameras
  const [selectedCameras, setSelectedCameras] = useState<string[] | undefined>(
    () => {
      if (lockedCamera) return [lockedCamera];
      if (defaultCamera) return [defaultCamera];
      return undefined;
    },
  );

  const { messages, clear } = useWsMessageBuffer(maxSize, paused, {
    cameraFilter: selectedCameras,
  });

  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const availableCameras = useMemo(() => {
    if (!config?.cameras) return [];
    return Object.keys(config.cameras)
      .filter((name) => {
        const cam = config.cameras[name];
        return !isReplayCamera(name) && cam.enabled_in_config;
      })
      .sort();
  }, [config]);

  const filteredMessages = useMemo(() => {
    return messages.filter((msg: WsFeedMessage) => {
      if (!matchesCategories(msg, selectedTopics)) return false;
      return true;
    });
  }, [messages, selectedTopics]);

  // Auto-scroll logic
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    autoScrollRef.current = atBottom;
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || !autoScrollRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [filteredMessages.length]);

  return (
    <div className="flex size-full flex-col">
      {/* Toolbar */}
      <div className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-secondary p-2">
        <div className="flex flex-row flex-wrap items-center gap-1">
          <TopicFilterButton
            selectedTopics={selectedTopics}
            updateTopicFilter={setSelectedTopics}
          />

          {!lockedCamera && (
            <WsCamerasFilterButton
              allCameras={availableCameras}
              selectedCameras={selectedCameras}
              updateCameraFilter={setSelectedCameras}
            />
          )}
        </div>

        <div className="flex flex-row items-center gap-2">
          <Badge variant="secondary" className="text-xs text-primary-variant">
            {t("logs.websocket.count", {
              count: filteredMessages.length,
            })}
          </Badge>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setPaused(!paused)}
              aria-label={
                paused ? t("logs.websocket.resume") : t("logs.websocket.pause")
              }
            >
              {paused ? (
                <FaPlay className="size-2.5" />
              ) : (
                <FaPause className="size-2.5" />
              )}
              {paused ? t("logs.websocket.resume") : t("logs.websocket.pause")}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={clear}
              aria-label={t("logs.websocket.clear")}
            >
              <FaEraser className="size-2.5" />
              {t("logs.websocket.clear")}
            </Button>
          </div>
        </div>
      </div>

      {/* Feed area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="scrollbar-container flex-1 overflow-y-auto"
      >
        {filteredMessages.length === 0 ? (
          <div className="flex size-full items-center justify-center p-8 text-sm text-muted-foreground">
            {t("logs.websocket.empty")}
          </div>
        ) : (
          filteredMessages.map((msg: WsFeedMessage) => (
            <WsMessageRow
              key={msg.id}
              message={msg}
              showCameraBadge={showCameraBadge}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Topic Filter Button

type TopicFilterButtonProps = {
  selectedTopics: TopicCategory[] | undefined;
  updateTopicFilter: (topics: TopicCategory[] | undefined) => void;
};

function TopicFilterButton({
  selectedTopics,
  updateTopicFilter,
}: TopicFilterButtonProps) {
  const { t } = useTranslation(["views/system"]);
  const [open, setOpen] = useState(false);
  const [currentTopics, setCurrentTopics] = useState<
    TopicCategory[] | undefined
  >(selectedTopics);

  useEffect(() => {
    setCurrentTopics(selectedTopics);
  }, [selectedTopics]);

  const isFiltered = selectedTopics !== undefined;

  const trigger = (
    <Button
      variant={isFiltered ? "select" : "outline"}
      size="sm"
      className="h-7 gap-1 px-2 text-xs"
      aria-label={t("logs.websocket.filter.all")}
    >
      <FaFilter
        className={`size-2.5 ${isFiltered ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <span className={isFiltered ? "text-selected-foreground" : ""}>
        {t("logs.websocket.filter.topics")}
      </span>
    </Button>
  );

  const content = (
    <TopicFilterContent
      currentTopics={currentTopics}
      setCurrentTopics={setCurrentTopics}
      onApply={() => {
        updateTopicFilter(currentTopics);
        setOpen(false);
      }}
      onReset={() => {
        setCurrentTopics(undefined);
        updateTopicFilter(undefined);
      }}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open) => {
          if (!open) setCurrentTopics(selectedTopics);
          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(open) => {
        if (!open) setCurrentTopics(selectedTopics);
        setOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>{content}</DropdownMenuContent>
    </DropdownMenu>
  );
}

type TopicFilterContentProps = {
  currentTopics: TopicCategory[] | undefined;
  setCurrentTopics: (topics: TopicCategory[] | undefined) => void;
  onApply: () => void;
  onReset: () => void;
};

function TopicFilterContent({
  currentTopics,
  setCurrentTopics,
  onApply,
  onReset,
}: TopicFilterContentProps) {
  const { t } = useTranslation(["views/system", "common"]);

  return (
    <>
      <div className="flex flex-col gap-2.5 p-4">
        <FilterSwitch
          isChecked={currentTopics === undefined}
          label={t("logs.websocket.filter.all")}
          onCheckedChange={(isChecked) => {
            if (isChecked) {
              setCurrentTopics(undefined);
            }
          }}
        />
        <DropdownMenuSeparator />
        {ALL_TOPIC_CATEGORIES.map((cat) => (
          <FilterSwitch
            key={cat}
            isChecked={currentTopics?.includes(cat) ?? false}
            label={t(`logs.websocket.filter.${cat}`)}
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                const updated = currentTopics ? [...currentTopics, cat] : [cat];
                setCurrentTopics(updated);
              } else {
                const updated = currentTopics
                  ? currentTopics.filter((c) => c !== cat)
                  : [];
                if (updated.length === 0) {
                  setCurrentTopics(undefined);
                } else {
                  setCurrentTopics(updated);
                }
              }
            }}
          />
        ))}
      </div>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-evenly p-2">
        <Button
          aria-label={t("button.apply", { ns: "common" })}
          variant="select"
          size="sm"
          onClick={onApply}
        >
          {t("button.apply", { ns: "common" })}
        </Button>
        <Button
          aria-label={t("button.reset", { ns: "common" })}
          size="sm"
          onClick={onReset}
        >
          {t("button.reset", { ns: "common" })}
        </Button>
      </div>
    </>
  );
}

// Camera Filter Button

type WsCamerasFilterButtonProps = {
  allCameras: string[];
  selectedCameras: string[] | undefined;
  updateCameraFilter: (cameras: string[] | undefined) => void;
};

function WsCamerasFilterButton({
  allCameras,
  selectedCameras,
  updateCameraFilter,
}: WsCamerasFilterButtonProps) {
  const { t } = useTranslation(["views/system", "common"]);
  const [open, setOpen] = useState(false);
  const [currentCameras, setCurrentCameras] = useState<string[] | undefined>(
    selectedCameras,
  );

  useEffect(() => {
    setCurrentCameras(selectedCameras);
  }, [selectedCameras]);

  const isFiltered = selectedCameras !== undefined;

  const trigger = (
    <Button
      variant={isFiltered ? "select" : "outline"}
      size="sm"
      className="h-7 gap-1 px-2 text-xs"
      aria-label={t("logs.websocket.filter.all_cameras")}
    >
      <FaVideo
        className={`size-2.5 ${isFiltered ? "text-selected-foreground" : "text-secondary-foreground"}`}
      />
      <span className={isFiltered ? "text-selected-foreground" : ""}>
        {!selectedCameras
          ? t("logs.websocket.filter.all_cameras")
          : t("logs.websocket.filter.cameras_count", {
              count: selectedCameras.length,
            })}
      </span>
    </Button>
  );

  const content = (
    <WsCamerasFilterContent
      allCameras={allCameras}
      currentCameras={currentCameras}
      setCurrentCameras={setCurrentCameras}
      onApply={() => {
        updateCameraFilter(currentCameras);
        setOpen(false);
      }}
      onReset={() => {
        setCurrentCameras(undefined);
        updateCameraFilter(undefined);
      }}
    />
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open) => {
          if (!open) setCurrentCameras(selectedCameras);
          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu
      modal={false}
      open={open}
      onOpenChange={(open) => {
        if (!open) setCurrentCameras(selectedCameras);
        setOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>{content}</DropdownMenuContent>
    </DropdownMenu>
  );
}

type WsCamerasFilterContentProps = {
  allCameras: string[];
  currentCameras: string[] | undefined;
  setCurrentCameras: (cameras: string[] | undefined) => void;
  onApply: () => void;
  onReset: () => void;
};

function WsCamerasFilterContent({
  allCameras,
  currentCameras,
  setCurrentCameras,
  onApply,
  onReset,
}: WsCamerasFilterContentProps) {
  const { t } = useTranslation(["views/system", "common"]);

  return (
    <>
      <div className="scrollbar-container flex max-h-[60dvh] flex-col gap-2.5 overflow-y-auto p-4">
        <FilterSwitch
          isChecked={currentCameras === undefined}
          label={t("logs.websocket.filter.all_cameras")}
          onCheckedChange={(isChecked) => {
            if (isChecked) {
              setCurrentCameras(undefined);
            }
          }}
        />
        <DropdownMenuSeparator />
        {allCameras.map((cam) => (
          <FilterSwitch
            key={cam}
            isChecked={currentCameras?.includes(cam) ?? false}
            label={cam}
            type="camera"
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                const updated = currentCameras ? [...currentCameras] : [];
                if (!updated.includes(cam)) {
                  updated.push(cam);
                }
                setCurrentCameras(updated);
              } else {
                const updated = currentCameras ? [...currentCameras] : [];
                if (updated.length > 1) {
                  updated.splice(updated.indexOf(cam), 1);
                  setCurrentCameras(updated);
                }
              }
            }}
          />
        ))}
      </div>
      <DropdownMenuSeparator />
      <div className="flex items-center justify-evenly p-2">
        <Button
          aria-label={t("button.apply", { ns: "common" })}
          variant="select"
          size="sm"
          disabled={currentCameras?.length === 0}
          onClick={onApply}
        >
          {t("button.apply", { ns: "common" })}
        </Button>
        <Button
          aria-label={t("button.reset", { ns: "common" })}
          size="sm"
          onClick={onReset}
        >
          {t("button.reset", { ns: "common" })}
        </Button>
      </div>
    </>
  );
}
