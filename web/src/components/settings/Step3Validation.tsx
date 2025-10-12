import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { LuRotateCcw } from "react-icons/lu";
import { useState, useCallback, useMemo, useEffect } from "react";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import axios from "axios";
import { toast } from "sonner";
import MSEPlayer from "@/components/player/MsePlayer";
import { WizardFormData, StreamConfig, TestResult } from "@/types/cameraWizard";
import { PlayerStatsType } from "@/types/live";

type Step3ValidationProps = {
  wizardData: Partial<WizardFormData>;
  onUpdate: (data: Partial<WizardFormData>) => void;
  onSave: (config: WizardFormData) => void;
  onBack?: () => void;
  isLoading?: boolean;
};

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

  if (error) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg bg-danger/20 p-4">
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
      <div className="flex h-32 items-center justify-center rounded-lg bg-secondary">
        <ActivityIndicator className="size-4" />
        <span className="ml-2 text-sm">
          {t("cameraWizard.step3.connecting")}
        </span>
      </div>
    );
  }

  return (
    <MSEPlayer
      camera={streamId}
      playbackEnabled={true}
      className="max-h-[20dvh] w-full rounded-lg"
      getStats={true}
      setStats={handleStats}
      onError={() => setError(true)}
    />
  );
}

export default function Step3Validation({
  wizardData,
  onUpdate,
  onSave,
  onBack,
  isLoading = false,
}: Step3ValidationProps) {
  const { t } = useTranslation(["views/settings"]);
  const [isValidating, setIsValidating] = useState(false);
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
        toast.success(t("cameraWizard.step3.validationSuccess"));
      } else {
        toast.warning(t("cameraWizard.step3.validationPartial"));
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
      wizardData.streams.some((s) => s.roles.includes("detect"))
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
              ? t("cameraWizard.step3.validating")
              : t("cameraWizard.step3.revalidateStreams")}
          </Button>
        </div>

        <div className="space-y-3">
          {streams.map((stream, index) => {
            const result = validationResults.get(stream.id);
            return (
              <div key={stream.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-medium">
                    {t("cameraWizard.step3.streamTitle", { number: index + 1 })}
                  </h4>
                  {result ? (
                    <span
                      className={`rounded px-2 py-1 text-sm ${
                        result.success
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {result.success
                        ? t("cameraWizard.step3.valid")
                        : t("cameraWizard.step3.failed")}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t("cameraWizard.step3.notTested")}
                    </span>
                  )}
                </div>

                <div className="mb-3">
                  <StreamPreview
                    stream={stream}
                    onBandwidthUpdate={handleBandwidthUpdate}
                  />
                </div>

                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {stream.url}
                  </span>
                  <Button
                    onClick={() => validateStream(stream)}
                    variant="outline"
                    size="sm"
                  >
                    {t("cameraWizard.step3.testStream")}
                  </Button>
                </div>

                {(() => {
                  const streamBandwidth = measuredBandwidth.get(stream.id);
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
                      <span className="font-medium">
                        {t("cameraWizard.step3.estimatedBandwidth")}:
                      </span>{" "}
                      <span className="text-selected">
                        {streamBandwidth.toFixed(1)}{" "}
                        {t("unit.data.kbps", { ns: "common" })}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        ({perHourDisplay})
                      </span>
                    </div>
                  );
                })()}

                <div className="text-sm">
                  <span className="font-medium">
                    {t("cameraWizard.step3.roles")}:
                  </span>{" "}
                  {stream.roles.join(", ") || t("cameraWizard.step3.none")}
                </div>

                {result && (
                  <div className="mt-2 text-sm">
                    {result.success ? (
                      <div className="space-y-1">
                        {result.resolution && (
                          <div>
                            {t("cameraWizard.testResultLabels.resolution")}:{" "}
                            {result.resolution}
                          </div>
                        )}
                        {result.videoCodec && (
                          <div>
                            {t("cameraWizard.testResultLabels.video")}:{" "}
                            {result.videoCodec}
                          </div>
                        )}
                        {result.audioCodec && (
                          <div>
                            {t("cameraWizard.testResultLabels.audio")}:{" "}
                            {result.audioCodec}
                          </div>
                        )}
                        {result.fps && (
                          <div>
                            {t("cameraWizard.testResultLabels.fps")}:{" "}
                            {result.fps}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-danger">
                        {t("cameraWizard.step3.error")}: {result.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-4">
        {onBack && (
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="sm:flex-1"
          >
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
