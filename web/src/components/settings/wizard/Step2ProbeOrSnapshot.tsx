import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useEffect } from "react";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import axios from "axios";
import { toast } from "sonner";
import type {
  WizardFormData,
  TestResult,
  StreamConfig,
  StreamRole,
  OnvifProbeResponse,
  CandidateTestMap,
  FfprobeStream,
  FfprobeData,
  FfprobeResponse,
} from "@/types/cameraWizard";
import { FaCircleCheck } from "react-icons/fa6";
import { Card, CardContent, CardTitle } from "../../ui/card";
import OnvifProbeResults from "./OnvifProbeResults";
import { CAMERA_BRANDS } from "@/types/cameraWizard";
import { detectReolinkCamera } from "@/utils/cameraUtil";

type Step2ProbeOrSnapshotProps = {
  wizardData: Partial<WizardFormData>;
  onUpdate: (data: Partial<WizardFormData>) => void;
  onNext: (data?: Partial<WizardFormData>) => void;
  onBack: () => void;
  probeMode: boolean;
};

export default function Step2ProbeOrSnapshot({
  wizardData,
  onUpdate,
  onNext,
  onBack,
  probeMode,
}: Step2ProbeOrSnapshotProps) {
  const { t } = useTranslation(["views/settings"]);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string>("");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probeResult, setProbeResult] = useState<OnvifProbeResponse | null>(
    null,
  );
  const [testingCandidates, setTestingCandidates] = useState<
    Record<string, boolean>
  >({} as Record<string, boolean>);
  const [candidateTests, setCandidateTests] = useState<CandidateTestMap>(
    {} as CandidateTestMap,
  );

  const probeUri = useCallback(
    async (
      uri: string,
      fetchSnapshot = false,
      setStatus?: (s: string) => void,
    ): Promise<TestResult> => {
      try {
        const probeResponse = await axios.get("ffprobe", {
          params: { paths: uri, detailed: true },
          timeout: 10000,
        });

        let probeData: FfprobeResponse | null = null;
        if (
          probeResponse.data &&
          probeResponse.data.length > 0 &&
          probeResponse.data[0].return_code === 0
        ) {
          probeData = probeResponse.data[0];
        }

        if (!probeData) {
          const error =
            Array.isArray(probeResponse.data?.[0]?.stderr) &&
            probeResponse.data[0].stderr.length > 0
              ? probeResponse.data[0].stderr.join("\n")
              : "Unable to probe stream";
          return { success: false, error };
        }

        let ffprobeData: FfprobeData;
        if (typeof probeData.stdout === "string") {
          try {
            ffprobeData = JSON.parse(probeData.stdout as string) as FfprobeData;
          } catch {
            ffprobeData = { streams: [] };
          }
        } else {
          ffprobeData = probeData.stdout as FfprobeData;
        }

        const streams = ffprobeData.streams || [];

        const videoStream = streams.find(
          (s: FfprobeStream) =>
            s.codec_type === "video" ||
            s.codec_name?.includes("h264") ||
            s.codec_name?.includes("hevc"),
        );

        const audioStream = streams.find(
          (s: FfprobeStream) =>
            s.codec_type === "audio" ||
            s.codec_name?.includes("aac") ||
            s.codec_name?.includes("mp3") ||
            s.codec_name?.includes("pcm_mulaw") ||
            s.codec_name?.includes("pcm_alaw"),
        );

        let resolution: string | undefined = undefined;
        if (videoStream) {
          const width = Number(videoStream.width || 0);
          const height = Number(videoStream.height || 0);
          if (width > 0 && height > 0) {
            resolution = `${width}x${height}`;
          }
        }

        const fps = videoStream?.avg_frame_rate
          ? parseFloat(videoStream.avg_frame_rate.split("/")[0]) /
            parseFloat(videoStream.avg_frame_rate.split("/")[1])
          : undefined;

        let snapshotBase64: string | undefined = undefined;
        if (fetchSnapshot) {
          if (setStatus) {
            setStatus(t("cameraWizard.step2.testing.fetchingSnapshot"));
          }
          try {
            const snapshotResponse = await axios.get("ffprobe/snapshot", {
              params: { url: uri },
              responseType: "blob",
              timeout: 10000,
            });
            const snapshotBlob = snapshotResponse.data;
            snapshotBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(snapshotBlob);
            });
          } catch (snapshotError) {
            snapshotBase64 = undefined;
          }
        }

        const streamTestResult: TestResult = {
          success: true,
          snapshot: snapshotBase64,
          resolution,
          videoCodec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name,
          fps: fps && !isNaN(fps) ? fps : undefined,
        };

        return streamTestResult;
      } catch (err) {
        const axiosError = err as {
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
    [t],
  );

  const probeCamera = useCallback(async () => {
    if (!wizardData.host) {
      toast.error(t("cameraWizard.step2.errors.hostRequired"));
      return;
    }

    setIsProbing(true);
    setProbeError(null);
    setProbeResult(null);

    try {
      const response = await axios.get("/onvif/probe", {
        params: {
          host: wizardData.host,
          port: wizardData.onvifPort ?? 80,
          username: wizardData.username || "",
          password: wizardData.password || "",
          test: false,
          auth_type: wizardData.useDigestAuth ? "digest" : "basic",
        },
        timeout: 30000,
      });

      if (response.data && response.data.success) {
        setProbeResult(response.data);
        // Extract candidate URLs and pass to wizardData
        const candidateUris = (response.data.rtsp_candidates || [])
          .filter((c: { source: string }) => c.source === "GetStreamUri")
          .map((c: { uri: string }) => c.uri);
        onUpdate({
          probeMode: true,
          probeCandidates: candidateUris,
          candidateTests: {},
        });
      } else {
        setProbeError(response.data?.message || "Probe failed");
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
        "Failed to probe camera";
      setProbeError(errorMessage);
      toast.error(t("cameraWizard.step2.probeFailed", { error: errorMessage }));
    } finally {
      setIsProbing(false);
    }
  }, [wizardData, onUpdate, t]);

  const testAllSelectedCandidates = useCallback(async () => {
    const uris = (probeResult?.rtsp_candidates || [])
      .filter((c) => c.source === "GetStreamUri")
      .map((c) => c.uri);

    if (!uris || uris.length === 0) {
      toast.error(t("cameraWizard.commonErrors.noUrl"));
      return;
    }

    // Prepare an initial stream so the wizard can proceed to step 3.
    // Use the first candidate as the initial stream (no extra probing here).
    const streamsToCreate: StreamConfig[] = [];
    if (uris.length > 0) {
      const first = uris[0];
      streamsToCreate.push({
        id: `stream_${Date.now()}`,
        url: first,
        roles: ["detect" as const],
        testResult: candidateTests[first],
      });
    }

    // Use existing candidateTests state (may contain entries from individual tests)
    onNext({
      probeMode: true,
      probeCandidates: uris,
      candidateTests: candidateTests,
      streams: streamsToCreate,
    });
  }, [probeResult, candidateTests, onNext, t]);

  const testCandidate = useCallback(
    async (uri: string) => {
      if (!uri) return;
      setTestingCandidates((s) => ({ ...s, [uri]: true }));
      try {
        const result = await probeUri(uri, false);
        setCandidateTests((s) => ({ ...s, [uri]: result }));
      } finally {
        setTestingCandidates((s) => ({ ...s, [uri]: false }));
      }
    },
    [probeUri],
  );

  const generateDynamicStreamUrl = useCallback(
    async (data: Partial<WizardFormData>): Promise<string | null> => {
      const brand = CAMERA_BRANDS.find((b) => b.value === data.brandTemplate);
      if (!brand || !data.host) return null;

      let protocol = undefined;
      if (data.brandTemplate === "reolink" && data.username && data.password) {
        try {
          protocol = await detectReolinkCamera(
            data.host,
            data.username,
            data.password,
          );
        } catch (error) {
          return null;
        }
      }

      const protocolKey = protocol || "rtsp";
      const templates: Record<string, string> = brand.dynamicTemplates || {};

      if (Object.keys(templates).includes(protocolKey)) {
        const template =
          templates[protocolKey as keyof typeof brand.dynamicTemplates];
        return template
          .replace("{username}", data.username || "")
          .replace("{password}", data.password || "")
          .replace("{host}", data.host);
      }

      return null;
    },
    [],
  );

  const generateStreamUrl = useCallback(
    async (data: Partial<WizardFormData>): Promise<string> => {
      if (data.brandTemplate === "other") {
        return data.customUrl || "";
      }

      const brand = CAMERA_BRANDS.find((b) => b.value === data.brandTemplate);
      if (!brand || !data.host) return "";

      if (brand.template === "dynamic" && "dynamicTemplates" in brand) {
        const dynamicUrl = await generateDynamicStreamUrl(data);

        if (dynamicUrl) {
          return dynamicUrl;
        }

        return "";
      }

      return brand.template
        .replace("{username}", data.username || "")
        .replace("{password}", data.password || "")
        .replace("{host}", data.host);
    },
    [generateDynamicStreamUrl],
  );

  const testConnection = useCallback(
    async (showToast = true) => {
      const streamUrl = await generateStreamUrl(wizardData);

      if (!streamUrl) {
        toast.error(t("cameraWizard.commonErrors.noUrl"));
        return;
      }

      setIsTesting(true);
      setTestStatus("");
      setTestResult(null);

      try {
        setTestStatus(t("cameraWizard.step2.testing.probingMetadata"));
        const result = await probeUri(streamUrl, true, setTestStatus);

        if (result && result.success) {
          setTestResult(result);
          const streamId = `stream_${Date.now()}`;
          onUpdate({
            streams: [
              {
                id: streamId,
                url: streamUrl,
                roles: ["detect"] as StreamRole[],
                testResult: result,
              },
            ],
          });

          if (showToast) {
            toast.success(t("cameraWizard.step2.testSuccess"));
          }
        } else {
          const errMsg = result?.error || "Unable to probe stream";
          setTestResult({
            success: false,
            error: errMsg,
          });

          if (showToast) {
            toast.error(
              t("cameraWizard.commonErrors.testFailed", { error: errMsg }),
              {
                duration: 6000,
              },
            );
          }
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
        setTestResult({
          success: false,
          error: errorMessage,
        });

        if (showToast) {
          toast.error(
            t("cameraWizard.commonErrors.testFailed", { error: errorMessage }),
            {
              duration: 10000,
            },
          );
        }
      } finally {
        setIsTesting(false);
        setTestStatus("");
      }
    },
    [wizardData, generateStreamUrl, t, onUpdate, probeUri],
  );

  const handleContinue = useCallback(() => {
    onNext();
  }, [onNext]);

  // Auto-start probe or test when step loads
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!hasStarted) {
      setHasStarted(true);
      if (probeMode) {
        probeCamera();
      } else {
        // Auto-run the connection test but suppress toasts to avoid duplicates
        testConnection(false);
      }
    }
  }, [hasStarted, probeMode, probeCamera, testConnection]);

  return (
    <div className="space-y-6">
      {probeMode ? (
        // Probe mode: show probe results directly
        <>
          {probeResult && (
            <div className="space-y-4">
              <OnvifProbeResults
                isLoading={isProbing}
                isError={!!probeError}
                error={probeError || undefined}
                probeResult={probeResult}
                onRetry={probeCamera}
                testCandidate={testCandidate}
                candidateTests={candidateTests}
                testingCandidates={testingCandidates}
              />
            </div>
          )}

          <ProbeFooterButtons
            isProbing={isProbing}
            probeError={probeError}
            onBack={onBack}
            onTestAll={testAllSelectedCandidates}
            onRetry={probeCamera}
            // disable next if either the overall testConnection is running or any candidate test is running
            isTesting={
              isTesting || Object.values(testingCandidates).some((v) => v)
            }
            candidateCount={
              (probeResult?.rtsp_candidates || []).filter(
                (c) => c.source === "GetStreamUri",
              ).length
            }
          />
        </>
      ) : (
        // Manual mode: show snapshot and stream details
        <>
          {testResult?.success && (
            <div className="p-4">
              <div className="mb-3 flex flex-row items-center gap-2 text-sm font-medium text-success">
                <FaCircleCheck className="size-4" />
                {t("cameraWizard.step2.testSuccess")}
              </div>

              <div className="space-y-3">
                {testResult.snapshot ? (
                  <div className="relative flex justify-center">
                    <img
                      src={testResult.snapshot}
                      alt="Camera snapshot"
                      className="max-h-[50dvh] max-w-full rounded-lg object-contain"
                    />
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/70 p-3 text-sm backdrop-blur-sm">
                      <div className="space-y-1">
                        <StreamDetails testResult={testResult} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Card className="p-4">
                    <CardTitle className="mb-2 text-sm">
                      {t("cameraWizard.step2.streamDetails")}
                    </CardTitle>
                    <CardContent className="p-0 text-sm">
                      <StreamDetails testResult={testResult} />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {isTesting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ActivityIndicator className="size-4" />
              {testStatus}
            </div>
          )}

          {testResult && !testResult.success && (
            <div className="space-y-4">
              <div className="text-sm text-destructive">{testResult.error}</div>
            </div>
          )}

          <ProbeFooterButtons
            mode="manual"
            isProbing={false}
            probeError={null}
            onBack={onBack}
            onTestAll={testAllSelectedCandidates}
            onRetry={probeCamera}
            isTesting={
              isTesting || Object.values(testingCandidates).some((v) => v)
            }
            candidateCount={
              (probeResult?.rtsp_candidates || []).filter(
                (c) => c.source === "GetStreamUri",
              ).length
            }
            manualTestSuccess={!!testResult?.success}
            onContinue={handleContinue}
            onManualTest={testConnection}
          />
        </>
      )}
    </div>
  );
}

function StreamDetails({ testResult }: { testResult: TestResult }) {
  const { t } = useTranslation(["views/settings"]);

  return (
    <>
      {testResult.resolution && (
        <div>
          <span className="text-white/70">
            {t("cameraWizard.testResultLabels.resolution")}:
          </span>{" "}
          <span className="text-white">{testResult.resolution}</span>
        </div>
      )}
      {testResult.fps && (
        <div>
          <span className="text-white/70">
            {t("cameraWizard.testResultLabels.fps")}:
          </span>{" "}
          <span className="text-white">{testResult.fps}</span>
        </div>
      )}
      {testResult.videoCodec && (
        <div>
          <span className="text-white/70">
            {t("cameraWizard.testResultLabels.video")}:
          </span>{" "}
          <span className="text-white">{testResult.videoCodec}</span>
        </div>
      )}
      {testResult.audioCodec && (
        <div>
          <span className="text-white/70">
            {t("cameraWizard.testResultLabels.audio")}:
          </span>{" "}
          <span className="text-white">{testResult.audioCodec}</span>
        </div>
      )}
    </>
  );
}

type ProbeFooterProps = {
  isProbing: boolean;
  probeError: string | null;
  onBack: () => void;
  onTestAll: () => void;
  onRetry: () => void;
  isTesting: boolean;
  candidateCount?: number;
  mode?: "probe" | "manual";
  manualTestSuccess?: boolean;
  onContinue?: () => void;
  onManualTest?: () => void;
};

function ProbeFooterButtons({
  isProbing,
  probeError,
  onBack,
  onTestAll,
  onRetry,
  isTesting,
  candidateCount = 0,
  mode = "probe",
  manualTestSuccess,
  onContinue,
  onManualTest,
}: ProbeFooterProps) {
  const { t } = useTranslation(["views/settings"]);

  // Loading footer
  if (isProbing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ActivityIndicator className="size-4" />
          {t("cameraWizard.step2.probing")}
        </div>
        <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
          <Button type="button" onClick={onBack} disabled className="sm:flex-1">
            {t("button.back", { ns: "common" })}
          </Button>
          <Button
            type="button"
            disabled
            variant="select"
            className="flex items-center justify-center gap-2 sm:flex-1"
          >
            <ActivityIndicator className="size-4" />
            {t("cameraWizard.step2.probing")}
          </Button>
        </div>
      </div>
    );
  }

  // Error footer
  if (probeError) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-destructive">{probeError}</div>
        <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
          <Button type="button" onClick={onBack} className="sm:flex-1">
            {t("button.back", { ns: "common" })}
          </Button>
          <Button
            type="button"
            onClick={onRetry}
            variant="select"
            className="flex items-center justify-center gap-2 sm:flex-1"
          >
            {t("cameraWizard.step2.retry")}
          </Button>
        </div>
      </div>
    );
  }

  // Default footer: show back + test (test disabled if none selected or testing)
  // If manual mode, show Continue when test succeeded, otherwise show Test (calls onManualTest)
  if (mode === "manual") {
    return (
      <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
        <Button type="button" onClick={onBack} className="sm:flex-1">
          {t("button.back", { ns: "common" })}
        </Button>
        {manualTestSuccess ? (
          <Button
            type="button"
            onClick={onContinue}
            variant="select"
            className="flex items-center justify-center gap-2 sm:flex-1"
          >
            {t("button.continue", { ns: "common" })}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onManualTest}
            disabled={isTesting}
            variant="select"
            className="flex items-center justify-center gap-2 sm:flex-1"
          >
            {isTesting ? (
              <>
                <ActivityIndicator className="size-4" />{" "}
                {t("button.continue", { ns: "common" })}
              </>
            ) : (
              t("cameraWizard.step2.retry")
            )}
          </Button>
        )}
      </div>
    );
  }

  // Default probe footer
  return (
    <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
      <Button type="button" onClick={onBack} className="sm:flex-1">
        {t("button.back", { ns: "common" })}
      </Button>
      <Button
        type="button"
        onClick={onTestAll}
        disabled={isTesting || (candidateCount ?? 0) === 0}
        variant="select"
        className="flex items-center justify-center gap-2 sm:flex-1"
      >
        {t("button.next", { ns: "common" })}
      </Button>
    </div>
  );
}
