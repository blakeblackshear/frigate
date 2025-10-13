import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { LuRotateCcw } from "react-icons/lu";
import { useState, useCallback, useMemo, useEffect } from "react";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import axios from "axios";
import { toast } from "sonner";
import MSEPlayer from "@/components/player/MsePlayer";
import { WizardFormData, StreamConfig, TestResult } from "@/types/cameraWizard";
import { PlayerStatsType } from "@/types/live";
import { FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";
import { LuX } from "react-icons/lu";
import { Card, CardContent } from "../../ui/card";

type Step3ValidationProps = {
  wizardData: Partial<WizardFormData>;
  onUpdate: (data: Partial<WizardFormData>) => void;
  onSave: (config: WizardFormData) => void;
  onBack?: () => void;
  isLoading?: boolean;
};

export default function Step3Validation({
  wizardData,
  onUpdate,
  onSave,
  onBack,
  isLoading = false,
}: Step3ValidationProps) {
  const { t } = useTranslation(["views/settings"]);
  const [isValidating, setIsValidating] = useState(false);
  const [testingStreams, setTestingStreams] = useState<Set<string>>(new Set());
  const [measuredBandwidth, setMeasuredBandwidth] = useState<
    Map<string, number>
  >(new Map());

  const streams = useMemo(() => wizardData.streams || [], [wizardData.streams]);

  const handleBandwidthUpdate = useCallback(
    (streamId: string, bandwidth: number) => {
      setMeasuredBandwidth((prev) => new Map(prev).set(streamId, bandwidth));
    },
    [],
  );

  // Use test results from Step 2, but allow re-validation in Step 3
  const validationResults = useMemo(() => {
    const results = new Map<string, TestResult>();
    streams.forEach((stream) => {
      if (stream.testResult) {
        results.set(stream.id, stream.testResult);
      }
    });
    return results;
  }, [streams]);

  const performStreamValidation = useCallback(
    async (stream: StreamConfig): Promise<TestResult> => {
      try {
        const response = await axios.get("ffprobe", {
          params: { paths: stream.url, detailed: true },
          timeout: 10000,
        });

        if (response.data?.[0]?.return_code === 0) {
          const probeData = response.data[0];
          const streamData = probeData.stdout.streams || [];

          const videoStream = streamData.find(
            (s: { codec_type?: string; codec_name?: string }) =>
              s.codec_type === "video" ||
              s.codec_name?.includes("h264") ||
              s.codec_name?.includes("h265"),
          );

          const audioStream = streamData.find(
            (s: { codec_type?: string; codec_name?: string }) =>
              s.codec_type === "audio" ||
              s.codec_name?.includes("aac") ||
              s.codec_name?.includes("mp3"),
          );

          const resolution = videoStream
            ? `${videoStream.width}x${videoStream.height}`
            : undefined;

          const fps = videoStream?.r_frame_rate
            ? parseFloat(videoStream.r_frame_rate.split("/")[0]) /
              parseFloat(videoStream.r_frame_rate.split("/")[1])
            : undefined;

          return {
            success: true,
            resolution,
            videoCodec: videoStream?.codec_name,
            audioCodec: audioStream?.codec_name,
            fps: fps && !isNaN(fps) ? fps : undefined,
          };
        } else {
          const error = response.data?.[0]?.stderr || "Unknown error";
          return { success: false, error };
        }
      } catch (error) {
        const axiosError = error as {
          response?: { data?: { message?: string; detail?: string } };
          message?: string;
        };
        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.response?.data?.detail ||
          axiosError.message ||
          "Connection failed";

        return { success: false, error: errorMessage };
      }
    },
    [],
  );

  const validateStream = useCallback(
    async (stream: StreamConfig) => {
      if (!stream.url.trim()) {
        toast.error(t("cameraWizard.commonErrors.noUrl"));
        return;
      }

      setTestingStreams((prev) => new Set(prev).add(stream.id));

      const testResult = await performStreamValidation(stream);

      onUpdate({
        streams: streams.map((s) =>
          s.id === stream.id ? { ...s, testResult } : s,
        ),
      });

      if (testResult.success) {
        toast.success(
          t("cameraWizard.step3.streamValidated", {
            number: streams.findIndex((s) => s.id === stream.id) + 1,
          }),
        );
      } else {
        toast.error(
          t("cameraWizard.step3.streamValidationFailed", {
            number: streams.findIndex((s) => s.id === stream.id) + 1,
          }),
        );
      }

      setTestingStreams((prev) => {
        const newSet = new Set(prev);
        newSet.delete(stream.id);
        return newSet;
      });
    },
    [streams, onUpdate, t, performStreamValidation],
  );

  const validateAllStreams = useCallback(async () => {
    setIsValidating(true);
    const results = new Map<string, TestResult>();

    // Only test streams that haven't been tested or failed
    const streamsToTest = streams.filter(
      (stream) => !stream.testResult || !stream.testResult.success,
    );

    for (const stream of streamsToTest) {
      if (!stream.url.trim()) continue;

      const testResult = await performStreamValidation(stream);
      results.set(stream.id, testResult);
    }

    // Update wizard data with new test results
    if (results.size > 0) {
      const updatedStreams = streams.map((stream) => {
        const newResult = results.get(stream.id);
        if (newResult) {
          return { ...stream, testResult: newResult };
        }
        return stream;
      });

      onUpdate({ streams: updatedStreams });
    }

    setIsValidating(false);

    if (results.size > 0) {
      const successfulTests = Array.from(results.values()).filter(
        (r) => r.success,
      ).length;
      if (successfulTests === results.size) {
        toast.success(t("cameraWizard.step3.reconnectionSuccess"));
      } else {
        toast.warning(t("cameraWizard.step3.reconnectionPartial"));
      }
    }
  }, [streams, onUpdate, t, performStreamValidation]);

  const handleSave = useCallback(() => {
    if (!wizardData.cameraName || !wizardData.streams?.length) {
      toast.error(t("cameraWizard.step3.saveError"));
      return;
    }

    // Convert wizard data to final config format
    const configData = {
      cameraName: wizardData.cameraName,
      host: wizardData.host,
      username: wizardData.username,
      password: wizardData.password,
      brandTemplate: wizardData.brandTemplate,
      customUrl: wizardData.customUrl,
      streams: wizardData.streams,
      restreamIds: wizardData.restreamIds,
    };

    onSave(configData);
  }, [wizardData, onSave, t]);

  const canSave = useMemo(() => {
    return (
      wizardData.cameraName &&
      wizardData.streams?.length &&
      wizardData.streams.some((s) => s.roles.includes("detect")) &&
      wizardData.streams.every((s) => s.testResult) // All streams must be tested
    );
  }, [wizardData]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        {t("cameraWizard.step3.description")}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {t("cameraWizard.step3.validationTitle")}
          </h3>
          <Button
            onClick={validateAllStreams}
            disabled={isValidating || streams.length === 0}
            variant="outline"
          >
            {isValidating && <ActivityIndicator className="mr-2 size-4" />}
            {isValidating
              ? t("cameraWizard.step3.connecting")
              : t("cameraWizard.step3.connectAllStreams")}
          </Button>
        </div>

        <div className="space-y-3">
          {streams.map((stream, index) => {
            const result = validationResults.get(stream.id);
            return (
              <Card key={stream.id} className="bg-secondary text-primary">
                <CardContent className="space-y-4 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-end gap-2">
                      <div className="flex flex-col space-y-1">
                        <div className="flex flex-row items-center">
                          <h4 className="mr-2 font-medium">
                            {t("cameraWizard.step3.streamTitle", {
                              number: index + 1,
                            })}
                          </h4>
                          {stream.roles.map((role) => (
                            <Badge
                              variant="outline"
                              key={role}
                              className="mx-1 text-xs"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                        {result && result.success && (
                          <div className="mb-2 text-sm text-muted-foreground">
                            {[
                              result.resolution,
                              result.fps
                                ? `${result.fps} ${t("cameraWizard.testResultLabels.fps")}`
                                : null,
                              result.videoCodec,
                              result.audioCodec,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                      </div>
                    </div>
                    {result?.success && (
                      <div className="flex items-center gap-2 text-sm">
                        <FaCircleCheck className="size-4 text-success" />
                        <span className="text-success">
                          {t("cameraWizard.step2.connected")}
                        </span>
                      </div>
                    )}
                    {result && !result.success && (
                      <div className="flex items-center gap-2 text-sm">
                        <LuX className="size-4 text-danger" />
                        <span className="text-danger">
                          {t("cameraWizard.step2.notConnected")}
                        </span>
                      </div>
                    )}
                  </div>

                  {result?.success && (
                    <div className="mb-3">
                      <StreamPreview
                        stream={stream}
                        onBandwidthUpdate={handleBandwidthUpdate}
                      />
                    </div>
                  )}

                  <div className="mb-2 flex flex-col justify-between gap-1 md:flex-row md:items-center">
                    <span className="text-sm text-muted-foreground">
                      {stream.url}
                    </span>
                    <Button
                      onClick={() => {
                        if (result?.success) {
                          // Disconnect: clear the test result
                          onUpdate({
                            streams: streams.map((s) =>
                              s.id === stream.id
                                ? { ...s, testResult: undefined }
                                : s,
                            ),
                          });
                        } else {
                          // Test/Connect: perform validation
                          validateStream(stream);
                        }
                      }}
                      disabled={
                        testingStreams.has(stream.id) || !stream.url.trim()
                      }
                      variant="outline"
                      size="sm"
                    >
                      {testingStreams.has(stream.id) && (
                        <ActivityIndicator className="mr-2 size-4" />
                      )}
                      {result?.success
                        ? t("cameraWizard.step3.disconnectStream")
                        : testingStreams.has(stream.id)
                          ? t("cameraWizard.step3.connectingStream")
                          : t("cameraWizard.step3.connectStream")}
                    </Button>
                  </div>

                  {result && (
                    <div className="space-y-2">
                      <div className="text-xs">
                        {t("cameraWizard.step3.issues.title")}
                      </div>
                      <div className="rounded-lg bg-background p-3">
                        <StreamIssues
                          stream={stream}
                          measuredBandwidth={measuredBandwidth}
                          wizardData={wizardData}
                        />
                      </div>
                    </div>
                  )}

                  {result && !result.success && (
                    <div className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
                      <div className="font-medium">
                        {t("cameraWizard.step2.testFailedTitle")}
                      </div>
                      <div className="mt-1 text-xs">{result.error}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-4">
        {onBack && (
          <Button type="button" onClick={onBack} className="sm:flex-1">
            {t("button.back", { ns: "common" })}
          </Button>
        )}
        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave || isLoading}
          className="sm:flex-1"
          variant="select"
        >
          {isLoading && <ActivityIndicator className="mr-2 size-4" />}
          {isLoading
            ? t("button.saving", { ns: "common" })
            : t("cameraWizard.step3.saveAndApply")}
        </Button>
      </div>
    </div>
  );
}

type StreamIssuesProps = {
  stream: StreamConfig;
  measuredBandwidth: Map<string, number>;
  wizardData: Partial<WizardFormData>;
};

function StreamIssues({
  stream,
  measuredBandwidth,
  wizardData,
}: StreamIssuesProps) {
  const { t } = useTranslation(["views/settings"]);

  const issues = useMemo(() => {
    const result: Array<{
      type: "good" | "warning" | "error";
      message: string;
    }> = [];

    if (wizardData.brandTemplate === "reolink") {
      const streamUrl = stream.url.toLowerCase();
      if (streamUrl.startsWith("rtsp://")) {
        result.push({
          type: "warning",
          message: t("cameraWizard.step1.errors.brands.reolink-rtsp"),
        });
      }
    }

    // Video codec check
    if (stream.testResult?.videoCodec) {
      const videoCodec = stream.testResult.videoCodec.toLowerCase();
      if (["h264", "h265", "hevc"].includes(videoCodec)) {
        result.push({
          type: "good",
          message: t("cameraWizard.step3.issues.videoCodecGood", {
            codec: stream.testResult.videoCodec,
          }),
        });
      }
    }

    // Audio codec check
    if (stream.roles.includes("record")) {
      if (stream.testResult?.audioCodec) {
        const audioCodec = stream.testResult.audioCodec.toLowerCase();
        if (audioCodec === "aac") {
          result.push({
            type: "good",
            message: t("cameraWizard.step3.issues.audioCodecGood", {
              codec: stream.testResult.audioCodec,
            }),
          });
        } else {
          result.push({
            type: "error",
            message: t("cameraWizard.step3.issues.audioCodecRecordError"),
          });
        }
      } else {
        result.push({
          type: "warning",
          message: t("cameraWizard.step3.issues.noAudioWarning"),
        });
      }
    }

    // Audio detection check
    if (stream.roles.includes("audio")) {
      if (!stream.testResult?.audioCodec) {
        result.push({
          type: "error",
          message: t("cameraWizard.step3.issues.audioCodecRequired"),
        });
      }
    }

    // Restreaming check
    if (stream.roles.includes("record")) {
      const restreamIds = wizardData.restreamIds || [];
      if (restreamIds.includes(stream.id)) {
        result.push({
          type: "warning",
          message: t("cameraWizard.step3.issues.restreamingWarning"),
        });
      }
    }

    return result;
  }, [stream, wizardData, t]);

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <BandwidthDisplay
        streamId={stream.id}
        measuredBandwidth={measuredBandwidth}
      />
      <div className="space-y-1">
        {issues.map((issue, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {issue.type === "good" && (
              <FaCircleCheck className="size-4 flex-shrink-0 text-success" />
            )}
            {issue.type === "warning" && (
              <FaTriangleExclamation className="size-4 flex-shrink-0 text-yellow-500" />
            )}
            {issue.type === "error" && (
              <LuX className="size-4 flex-shrink-0 text-danger" />
            )}
            <span
              className={
                issue.type === "good"
                  ? "text-success"
                  : issue.type === "warning"
                    ? "text-yellow-500"
                    : "text-danger"
              }
            >
              {issue.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

type BandwidthDisplayProps = {
  streamId: string;
  measuredBandwidth: Map<string, number>;
};

function BandwidthDisplay({
  streamId,
  measuredBandwidth,
}: BandwidthDisplayProps) {
  const { t } = useTranslation(["views/settings"]);
  const streamBandwidth = measuredBandwidth.get(streamId);

  if (!streamBandwidth) return null;

  const perHour = streamBandwidth * 3600; // kB/hour
  const perHourDisplay =
    perHour >= 1000000
      ? `${(perHour / 1000000).toFixed(1)} ${t("unit.data.gbph", { ns: "common" })}`
      : perHour >= 1000
        ? `${(perHour / 1000).toFixed(1)} ${t("unit.data.mbph", { ns: "common" })}`
        : `${perHour.toFixed(0)} ${t("unit.data.kbph", { ns: "common" })}`;

  return (
    <div className="mb-2 text-sm">
      <span className="font-medium text-muted-foreground">
        {t("cameraWizard.step3.estimatedBandwidth")}:
      </span>{" "}
      <span className="text-secondary-foreground">
        {streamBandwidth.toFixed(1)} {t("unit.data.kbps", { ns: "common" })}
      </span>
      <span className="ml-2 text-muted-foreground">({perHourDisplay})</span>
    </div>
  );
}

type StreamPreviewProps = {
  stream: StreamConfig;
  onBandwidthUpdate?: (streamId: string, bandwidth: number) => void;
};

// live stream preview using MSEPlayer with temp go2rtc streams
function StreamPreview({ stream, onBandwidthUpdate }: StreamPreviewProps) {
  const { t } = useTranslation(["views/settings"]);
  const [streamId, setStreamId] = useState(`wizard_${stream.id}_${Date.now()}`);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState(false);

  const handleStats = useCallback(
    (stats: PlayerStatsType) => {
      if (stats.bandwidth > 0) {
        onBandwidthUpdate?.(stream.id, stats.bandwidth);
      }
    },
    [stream.id, onBandwidthUpdate],
  );

  const handleReload = useCallback(async () => {
    // Clean up old stream first
    if (streamId) {
      axios.delete(`go2rtc/streams/${streamId}`).catch(() => {
        // do nothing on cleanup errors - go2rtc won't consume the streams
      });
    }

    // Reset state and create new stream ID
    setError(false);
    setRegistered(false);
    setStreamId(`wizard_${stream.id}_${Date.now()}`);
  }, [stream.id, streamId]);

  useEffect(() => {
    // Register stream with go2rtc
    axios
      .put(`go2rtc/streams/${streamId}`, null, {
        params: { src: stream.url },
      })
      .then(() => {
        // Add small delay to allow go2rtc api to run and initialize the stream
        setTimeout(() => {
          setRegistered(true);
        }, 500);
      })
      .catch(() => {
        setError(true);
      });

    // Cleanup on unmount
    return () => {
      axios.delete(`go2rtc/streams/${streamId}`).catch(() => {
        // do nothing on cleanup errors - go2rtc won't consume the streams
      });
    };
  }, [stream.url, streamId]);

  const resolution = stream.testResult?.resolution;
  let aspectRatio = "16/9";
  if (resolution) {
    const [width, height] = resolution.split("x").map(Number);
    if (width && height) {
      aspectRatio = `${width}/${height}`;
    }
  }

  if (error) {
    return (
      <div
        className="flex max-h-[30dvh] flex-col items-center justify-center gap-2 rounded-lg bg-secondary p-4 md:max-h-[20dvh]"
        style={{ aspectRatio }}
      >
        <span className="text-sm text-danger">
          {t("cameraWizard.step3.streamUnavailable")}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReload}
          className="flex items-center gap-2"
        >
          <LuRotateCcw className="size-4" />
          {t("cameraWizard.step3.reload")}
        </Button>
      </div>
    );
  }

  if (!registered) {
    return (
      <div
        className="flex max-h-[30dvh] items-center justify-center rounded-lg bg-secondary md:max-h-[20dvh]"
        style={{ aspectRatio }}
      >
        <ActivityIndicator className="size-4" />
        <span className="ml-2 text-sm">
          {t("cameraWizard.step3.connecting")}
        </span>
      </div>
    );
  }

  return (
    <div
      className="relative max-h-[30dvh] md:max-h-[20dvh]"
      style={{ aspectRatio }}
    >
      <MSEPlayer
        camera={streamId}
        playbackEnabled={true}
        className="max-h-[30dvh] rounded-lg md:max-h-[20dvh]"
        getStats={true}
        setStats={handleStats}
        onError={() => setError(true)}
      />
    </div>
  );
}
