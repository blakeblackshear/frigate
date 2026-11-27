import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { isDesktop } from "react-device-detect";
import { FaTriangleExclamation } from "react-icons/fa6";
import { MdHighQuality } from "react-icons/md";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AutoQualityReason,
  PLAYBACK_QUALITIES,
  PlaybackQuality,
  RecordingCoverage,
  StreamMediaSummary,
} from "@/types/record";

const CODEC_DISPLAY_NAMES: Record<string, string> = {
  h264: "H.264",
  hevc: "H.265",
  h265: "H.265",
  av1: "AV1",
};

const AUDIO_CODEC_DISPLAY_NAMES: Record<string, string> = {
  aac: "AAC",
  pcm_alaw: "PCM-A",
  pcm_mulaw: "PCM-U",
  opus: "Opus",
  mp3: "MP3",
};

type QualitySubtitleProps = {
  streams?: RecordingCoverage["streams"];
  autoLow?: boolean;
  autoLowReason?: AutoQualityReason;
  mainUnsupported?: boolean;
};

type QualitySelectorProps = QualitySubtitleProps & {
  quality: PlaybackQuality;
  onSetQuality: (quality: PlaybackQuality) => void;
  setControlsOpen?: (open: boolean) => void;
  containerRef?: React.MutableRefObject<HTMLDivElement | null>;
};

function useQualitySubtitles({
  streams,
  autoLow,
  autoLowReason,
  mainUnsupported,
}: QualitySubtitleProps) {
  const { t } = useTranslation(["components/player"]);

  const streamSubtitle = useCallback(
    (summary?: StreamMediaSummary) => {
      if (!summary) {
        return undefined;
      }

      const parts: string[] = [];

      if (summary.video_codec != null) {
        parts.push(
          CODEC_DISPLAY_NAMES[summary.video_codec] ??
            summary.video_codec.toUpperCase(),
        );
      }

      // the codec decides whether the browser plays sound at all (AAC
      // decodes, G.711 does not), so lead with it when known
      const audioCodec =
        summary.audio_codec != null
          ? (AUDIO_CODEC_DISPLAY_NAMES[summary.audio_codec] ??
            summary.audio_codec.toUpperCase())
          : null;

      if (summary.has_audio === false) {
        parts.push(t("quality.noAudio"));
      } else if (audioCodec != null && summary.audio_rate != null) {
        parts.push(
          t("quality.audioCodecRate", {
            codec: audioCodec,
            rate: summary.audio_rate / 1000,
          }),
        );
      } else if (audioCodec != null) {
        parts.push(audioCodec);
      } else if (summary.audio_rate != null) {
        parts.push(t("quality.audioRate", { rate: summary.audio_rate / 1000 }));
      }

      return parts.length ? parts.join(" · ") : undefined;
    },
    [t],
  );

  const subtitles = useMemo<Partial<Record<PlaybackQuality, string>>>(
    () => ({
      auto: autoLow
        ? t(
            autoLowReason === "codec"
              ? "quality.autoLowCodec"
              : autoLowReason === "saveData"
                ? "quality.autoLowSaveData"
                : "quality.autoLow",
          )
        : undefined,
      // a stream absent from the summary has no footage in this range,
      // and a pin is never silently substituted
      main:
        streams && !streams.main
          ? t("quality.noRecordings")
          : mainUnsupported
            ? t("quality.notSupportedBrowser")
            : streamSubtitle(streams?.main),
      sub:
        streams && !streams.sub
          ? t("quality.noRecordings")
          : streamSubtitle(streams?.sub),
    }),
    [autoLow, autoLowReason, mainUnsupported, streamSubtitle, streams, t],
  );

  return subtitles;
}

export default function QualitySelector({
  quality,
  onSetQuality,
  setControlsOpen,
  containerRef,
  streams,
  autoLow,
  autoLowReason,
  mainUnsupported,
}: QualitySelectorProps) {
  const { t } = useTranslation(["components/player"]);
  const subtitles = useQualitySubtitles({
    streams,
    autoLow,
    autoLowReason,
    mainUnsupported,
  });

  const itemContent = useCallback(
    (q: PlaybackQuality) => (
      <div className="flex flex-col">
        <span>{t(`quality.${q}`)}</span>
        {subtitles[q] && (
          <span className="text-xs text-muted-foreground">{subtitles[q]}</span>
        )}
      </div>
    ),
    [subtitles, t],
  );

  const trigger = (
    <Button
      className="flex items-center gap-2.5 rounded-lg"
      aria-label={t("quality.label")}
      size="sm"
    >
      <div className="relative">
        <MdHighQuality className="size-5 text-secondary-foreground" />
        {autoLow && (
          <FaTriangleExclamation className="absolute -bottom-0.5 -right-1 size-3 text-danger" />
        )}
      </div>
      {isDesktop && <div className="text-primary">{t("quality.label")}</div>}
    </Button>
  );

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (setControlsOpen) {
          setControlsOpen(open);
        }
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        portalProps={{
          container: containerRef?.current,
        }}
      >
        <DropdownMenuRadioGroup
          value={quality}
          onValueChange={(value) => onSetQuality(value as PlaybackQuality)}
        >
          {PLAYBACK_QUALITIES.map((q) => (
            <DropdownMenuRadioItem key={q} value={q} className="cursor-pointer">
              {itemContent(q)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type QualitySelectorContentProps = QualitySubtitleProps & {
  quality: PlaybackQuality;
  onSetQuality: (quality: PlaybackQuality) => void;
};

// drawer-friendly variant of the selector for the mobile settings drawer
export function QualitySelectorContent({
  quality,
  onSetQuality,
  streams,
  autoLow,
  autoLowReason,
  mainUnsupported,
}: QualitySelectorContentProps) {
  const { t } = useTranslation(["components/player"]);
  const subtitles = useQualitySubtitles({
    streams,
    autoLow,
    autoLowReason,
    mainUnsupported,
  });

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {PLAYBACK_QUALITIES.map((q) => (
        <div
          key={q}
          className={`w-full cursor-pointer rounded-lg py-2 text-center ${quality == q ? "bg-secondary" : ""}`}
          onClick={() => onSetQuality(q)}
        >
          <div className="smart-capitalize">{t(`quality.${q}`)}</div>
          {subtitles[q] && (
            <div className="text-xs text-muted-foreground">{subtitles[q]}</div>
          )}
        </div>
      ))}
    </div>
  );
}
