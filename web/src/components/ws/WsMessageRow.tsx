import { memo, useCallback, useState } from "react";
import { WsFeedMessage } from "@/api/ws";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { extractCameraName } from "@/utils/wsUtil";
import { getIconForLabel } from "@/utils/iconUtil";
import { LuCheck, LuCopy } from "react-icons/lu";

type TopicCategory = "events" | "camera_activity" | "system" | "other";

const TOPIC_CATEGORY_COLORS: Record<TopicCategory, string> = {
  events: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  camera_activity:
    "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
  system:
    "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30",
  other: "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  start:
    "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
  update: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30",
  end: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
};

const TRACKED_OBJECT_UPDATE_COLORS: Record<string, string> = {
  description:
    "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
  face: "bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30",
  lpr: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
  classification:
    "bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30",
};

function getEventTypeColor(eventType: string): string {
  return (
    EVENT_TYPE_COLORS[eventType] ||
    "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
  );
}

function getTrackedObjectTypeColor(objectType: string): string {
  return (
    TRACKED_OBJECT_UPDATE_COLORS[objectType] ||
    "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30"
  );
}

const EVENT_TOPICS = new Set([
  "events",
  "reviews",
  "tracked_object_update",
  "triggers",
]);

const SYSTEM_TOPICS = new Set([
  "stats",
  "model_state",
  "job_state",
  "embeddings_reindex_progress",
  "audio_transcription_state",
  "birdseye_layout",
]);

function getTopicCategory(topic: string): TopicCategory {
  if (EVENT_TOPICS.has(topic)) return "events";
  if (SYSTEM_TOPICS.has(topic)) return "system";
  if (
    topic === "camera_activity" ||
    topic === "audio_detections" ||
    topic.includes("/motion") ||
    topic.includes("/audio") ||
    topic.includes("/detect") ||
    topic.includes("/recordings") ||
    topic.includes("/enabled") ||
    topic.includes("/snapshots") ||
    topic.includes("/ptz")
  ) {
    return "camera_activity";
  }
  return "other";
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function getPayloadSummary(
  topic: string,
  payload: unknown,
  hideType: boolean = false,
): string {
  if (payload === null || payload === undefined) return "";

  try {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;

    if (typeof data === "object" && data !== null) {
      // Topic-specific summary handlers
      if (topic === "tracked_object_update") {
        return getTrackedObjectUpdateSummary(data);
      }

      if ("type" in data && "label" in (data.after || data)) {
        const after = data.after || data;
        const parts: string[] = [];

        if (!hideType) {
          parts.push(`type: ${data.type}`);
        }
        parts.push(`label: ${after.label || "?"}`);

        // Add sub_label for events topic if present
        if (topic === "events" && after.sub_label) {
          parts.push(`sub_label: ${after.sub_label}`);
        }

        return parts.join(", ");
      }
      if ("type" in data && "camera" in data) {
        if (hideType) {
          return `camera: ${data.camera}`;
        }
        return `type: ${data.type}, camera: ${data.camera}`;
      }
      const keys = Object.keys(data);
      if (keys.length <= 3) {
        return keys
          .map((k) => {
            const v = data[k];
            if (typeof v === "string" || typeof v === "number") {
              return `${k}: ${v}`;
            }
            return k;
          })
          .join(", ");
      }
      return `{${keys.length} keys}`;
    }

    const str = String(data);
    return str.length > 80 ? str.slice(0, 80) + "…" : str;
  } catch {
    const str = String(payload);
    return str.length > 80 ? str.slice(0, 80) + "…" : str;
  }
}

function getTrackedObjectUpdateSummary(data: unknown): string {
  if (typeof data !== "object" || data === null) return "";

  const obj = data as Record<string, unknown>;
  const type = obj.type as string;

  switch (type) {
    case "description":
      return obj.description ? `${obj.description}` : "no description";

    case "face": {
      const name = obj.name as string | undefined;
      return name || "unknown";
    }

    case "lpr": {
      const name = obj.name as string | undefined;
      const plate = obj.plate as string | undefined;
      return name || plate || "unknown";
    }

    case "classification": {
      const parts: string[] = [];
      const model = obj.model as string | undefined;
      const subLabel = obj.sub_label as string | undefined;
      const attribute = obj.attribute as string | undefined;

      if (model) parts.push(`model: ${model}`);
      if (subLabel) parts.push(`sub_label: ${subLabel}`);
      if (attribute) parts.push(`attribute: ${attribute}`);

      return parts.length > 0 ? parts.join(", ") : "classification";
    }

    default:
      return type || "unknown";
  }
}

function extractTypeForBadge(payload: unknown): string | null {
  if (payload === null || payload === undefined) return null;

  try {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;

    if (typeof data === "object" && data !== null && "type" in data) {
      return data.type as string;
    }
  } catch {
    // ignore
  }
  return null;
}

function shouldShowTypeBadge(type: string | null): boolean {
  if (!type) return false;
  return true;
}

function shouldShowSummary(topic: string): boolean {
  // Hide summary for reviews topic
  return topic !== "reviews";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightJson(value: unknown): string {
  // Try to auto-parse JSON strings
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null) {
        value = parsed;
      }
    } catch {
      // not JSON
    }
  }

  const raw = JSON.stringify(value, null, 2) ?? String(value);

  // Single regex pass to colorize JSON tokens
  return raw.replace(
    /("(?:[^"\\]|\\.)*")\s*:|("(?:[^"\\]|\\.)*")|(true|false|null)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, key: string, str: string, keyword: string, num: string) => {
      if (key) {
        return `<span class="text-indigo-400">${escapeHtml(key)}</span>:`;
      }
      if (str) {
        const content = escapeHtml(str);
        return `<span class="text-green-500">${content}</span>`;
      }
      if (keyword) {
        return `<span class="text-orange-500">${keyword}</span>`;
      }
      if (num) {
        return `<span class="text-cyan-500">${num}</span>`;
      }
      return match;
    },
  );
}

function CopyJsonButton({ payload }: { payload: unknown }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const text =
        typeof payload === "string"
          ? payload
          : JSON.stringify(payload, null, 2);
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    },
    [payload],
  );

  return (
    <button
      onClick={handleCopy}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      aria-label="Copy JSON"
    >
      {copied ? (
        <LuCheck className="size-3.5 text-green-500" />
      ) : (
        <LuCopy className="size-3.5" />
      )}
    </button>
  );
}

type WsMessageRowProps = {
  message: WsFeedMessage;
  showCameraBadge?: boolean;
};

const WsMessageRow = memo(function WsMessageRow({
  message,
  showCameraBadge = true,
}: WsMessageRowProps) {
  const { t } = useTranslation(["views/system"]);
  const [expanded, setExpanded] = useState(false);
  const category = getTopicCategory(message.topic);

  const cameraName = extractCameraName(message);

  const messageType = extractTypeForBadge(message.payload);
  const showTypeBadge = shouldShowTypeBadge(messageType);

  const summary = getPayloadSummary(message.topic, message.payload);

  const eventLabel = (() => {
    try {
      const data =
        typeof message.payload === "string"
          ? JSON.parse(message.payload)
          : message.payload;
      if (typeof data === "object" && data !== null) {
        return (data.after?.label as string) || (data.label as string) || null;
      }
    } catch {
      // ignore
    }
    return null;
  })();

  const parsedPayload = (() => {
    try {
      return typeof message.payload === "string"
        ? JSON.parse(message.payload)
        : message.payload;
    } catch {
      return message.payload;
    }
  })();

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Determine which color function to use based on topic
  const getTypeBadgeColor = (type: string | null) => {
    if (!type) return "";
    if (message.topic === "tracked_object_update") {
      return getTrackedObjectTypeColor(type);
    }
    return getEventTypeColor(type);
  };

  return (
    <div className="border-b border-secondary/50">
      <div
        className={cn(
          "flex cursor-pointer items-center gap-2 px-2 py-1.5 transition-colors hover:bg-muted/50",
          expanded && "bg-muted/30",
        )}
        onClick={handleToggle}
      >
        <ChevronRight
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />

        <span className="shrink-0 font-mono text-xs text-muted-foreground">
          {formatTimestamp(message.timestamp)}
        </span>

        <span
          className={cn(
            "shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs",
            TOPIC_CATEGORY_COLORS[category],
          )}
        >
          {message.topic}
        </span>

        {showTypeBadge && messageType && (
          <span
            className={cn(
              "shrink-0 rounded border px-1.5 py-0.5 text-xs",
              getTypeBadgeColor(messageType),
            )}
          >
            {messageType}
          </span>
        )}

        {showCameraBadge && cameraName && (
          <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
            {cameraName}
          </span>
        )}

        {eventLabel && (
          <span className="shrink-0">
            {getIconForLabel(
              eventLabel,
              "object",
              "size-3.5 text-primary-variant",
            )}
          </span>
        )}

        {shouldShowSummary(message.topic) && (
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {summary}
          </span>
        )}
      </div>

      {expanded && (
        <div className="border-t border-secondary/30 bg-background_alt/50 px-4 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("logs.websocket.expanded.payload")}
            </span>
            <CopyJsonButton payload={parsedPayload} />
          </div>
          <pre
            className="scrollbar-container max-h-[60vh] overflow-auto rounded bg-background p-2 font-mono text-[11px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightJson(parsedPayload) }}
          />
        </div>
      )}
    </div>
  );
});

export default WsMessageRow;
