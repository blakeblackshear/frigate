import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { WsFeedMessage } from "@/api/ws";
import { useWsMessageBuffer } from "@/hooks/use-ws-message-buffer";
import WsMessageRow from "./WsMessageRow";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FaEraser, FaPause, FaPlay } from "react-icons/fa";
import { FrigateConfig } from "@/types/frigateConfig";

type TopicPreset = "all" | "events" | "camera_activity" | "system";

const PRESET_TOPICS: Record<TopicPreset, Set<string> | "all"> = {
  all: "all",
  events: new Set(["events", "reviews", "tracked_object_update", "triggers"]),
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

function matchesPreset(topic: string, preset: TopicPreset): boolean {
  const topicSet = PRESET_TOPICS[preset];
  if (topicSet === "all") return true;
  if (topicSet.has(topic)) return true;

  if (preset === "camera_activity") {
    return CAMERA_ACTIVITY_TOPIC_PATTERNS.some((pattern) =>
      topic.includes(pattern),
    );
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
  const [topicPreset, setTopicPreset] = useState<TopicPreset>("all");
  const [cameraFilter, setCameraFilter] = useState<string>(
    lockedCamera ?? defaultCamera ?? "all",
  );

  const { messages, clear } = useWsMessageBuffer(maxSize, paused, {
    cameraFilter,
  });

  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  const cameraNames = useMemo(() => {
    if (!config?.cameras) return [];
    return Object.keys(config.cameras).sort();
  }, [config]);

  const filteredMessages = useMemo(() => {
    return messages.filter((msg: WsFeedMessage) => {
      if (!matchesPreset(msg.topic, topicPreset)) return false;
      return true;
    });
  }, [messages, topicPreset]);

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
      <div className="flex flex-row items-start justify-between gap-2 border-b border-secondary p-2">
        <div className="flex flex-col flex-wrap items-start gap-2">
          <ToggleGroup
            type="single"
            size="sm"
            value={topicPreset}
            onValueChange={(val: string) => {
              if (val) setTopicPreset(val as TopicPreset);
            }}
            className="flex-wrap"
          >
            <ToggleGroupItem
              value="all"
              className={topicPreset === "all" ? "" : "text-muted-foreground"}
            >
              {t("logs.websocket.filter.all")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="events"
              className={
                topicPreset === "events" ? "" : "text-muted-foreground"
              }
            >
              {t("logs.websocket.filter.events")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="camera_activity"
              className={
                topicPreset === "camera_activity" ? "" : "text-muted-foreground"
              }
            >
              {t("logs.websocket.filter.camera_activity")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="system"
              className={
                topicPreset === "system" ? "" : "text-muted-foreground"
              }
            >
              {t("logs.websocket.filter.system")}
            </ToggleGroupItem>
          </ToggleGroup>

          {!lockedCamera && (
            <Select value={cameraFilter} onValueChange={setCameraFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder={t("logs.websocket.filter.camera")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("logs.websocket.filter.all_cameras")}
                </SelectItem>
                {cameraNames.map((cam) => (
                  <SelectItem key={cam} value={cam}>
                    {config?.cameras[cam]?.friendly_name || cam}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex flex-col items-end gap-3">
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
