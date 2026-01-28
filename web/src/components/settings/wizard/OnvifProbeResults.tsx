import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { FaCopy, FaCheck } from "react-icons/fa";
import { LuX } from "react-icons/lu";
import { CiCircleAlert } from "react-icons/ci";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { toast } from "sonner";
import type {
  OnvifProbeResponse,
  OnvifRtspCandidate,
  TestResult,
  CandidateTestMap,
} from "@/types/cameraWizard";
import { FaCircleCheck } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { maskUri } from "@/utils/cameraUtil";

type OnvifProbeResultsProps = {
  isLoading: boolean;
  isError: boolean;
  error?: string;
  probeResult?: OnvifProbeResponse;
  onRetry: () => void;
  selectedUris?: string[];
  testCandidate?: (uri: string) => void;
  candidateTests?: CandidateTestMap;
  testingCandidates?: Record<string, boolean>;
};

export default function OnvifProbeResults({
  isLoading,
  isError,
  error,
  probeResult,
  onRetry,
  selectedUris,
  testCandidate,
  candidateTests,
  testingCandidates,
}: OnvifProbeResultsProps) {
  const { t } = useTranslation(["views/settings"]);
  const [copiedUri, setCopiedUri] = useState<string | null>(null);

  const handleCopyUri = (uri: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedUri(uri);
    toast.success(t("cameraWizard.step2.uriCopied"));
    setTimeout(() => setCopiedUri(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <ActivityIndicator className="size-6" />
        <p className="text-sm text-muted-foreground">
          {t("cameraWizard.step2.probingDevice")}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <CiCircleAlert className="size-5" />
          <AlertTitle>{t("cameraWizard.step2.probeError")}</AlertTitle>
          {error && <AlertDescription>{error}</AlertDescription>}
        </Alert>
        <Button onClick={onRetry} variant="outline" className="w-full">
          {t("button.retry", { ns: "common" })}
        </Button>
      </div>
    );
  }

  if (!probeResult?.success) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <CiCircleAlert className="size-5" />
          <AlertTitle>{t("cameraWizard.step2.probeNoSuccess")}</AlertTitle>
          {probeResult?.message && (
            <AlertDescription>{probeResult.message}</AlertDescription>
          )}
        </Alert>
        <Button onClick={onRetry} variant="outline" className="w-full">
          {t("button.retry", { ns: "common" })}
        </Button>
      </div>
    );
  }

  const rtspCandidates = (probeResult.rtsp_candidates || []).filter(
    (c) => c.source === "GetStreamUri",
  );

  if (probeResult?.success && rtspCandidates.length === 0) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <CiCircleAlert className="size-5" />
          <AlertTitle>{t("cameraWizard.step2.noRtspCandidates")}</AlertTitle>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {probeResult?.success && (
          <div className="mb-3 flex flex-row items-center gap-2 text-sm text-success">
            <FaCircleCheck className="size-4" />
            <span>{t("cameraWizard.step2.probeSuccessful")}</span>
          </div>
        )}
        <div className="text-sm">{t("cameraWizard.step2.deviceInfo")}</div>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            {probeResult.manufacturer && (
              <div>
                <span className="text-muted-foreground">
                  {t("cameraWizard.step2.manufacturer")}:
                </span>{" "}
                <span className="text-primary-variant">
                  {probeResult.manufacturer}
                </span>
              </div>
            )}
            {probeResult.model && (
              <div>
                <span className="text-muted-foreground">
                  {t("cameraWizard.step2.model")}:
                </span>{" "}
                <span className="text-primary-variant">
                  {probeResult.model}
                </span>
              </div>
            )}
            {probeResult.firmware_version && (
              <div>
                <span className="text-muted-foreground">
                  {t("cameraWizard.step2.firmware")}:
                </span>{" "}
                <span className="text-primary-variant">
                  {probeResult.firmware_version}
                </span>
              </div>
            )}
            {probeResult.profiles_count !== undefined && (
              <div>
                <span className="text-muted-foreground">
                  {t("cameraWizard.step2.profiles")}:
                </span>{" "}
                <span className="text-primary-variant">
                  {probeResult.profiles_count}
                </span>
              </div>
            )}
            {probeResult.ptz_supported !== undefined && (
              <div>
                <span className="text-muted-foreground">
                  {t("cameraWizard.step2.ptzSupport")}:
                </span>{" "}
                <span className="text-primary-variant">
                  {probeResult.ptz_supported
                    ? t("button.yes", { ns: "common" })
                    : t("button.no", { ns: "common" })}
                </span>
              </div>
            )}
            {probeResult.ptz_supported && probeResult.autotrack_supported && (
              <div>
                <span className="text-muted-foreground">
                  {t("cameraWizard.step2.autotrackingSupport")}:
                </span>{" "}
                <span className="text-primary-variant">
                  {t("button.yes", { ns: "common" })}
                </span>
              </div>
            )}
            {probeResult.ptz_supported &&
              probeResult.presets_count !== undefined && (
                <div>
                  <span className="text-muted-foreground">
                    {t("cameraWizard.step2.presets")}:
                  </span>{" "}
                  <span className="text-primary-variant">
                    {probeResult.presets_count}
                  </span>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
      <div className="space-y-2">
        {rtspCandidates.length > 0 && (
          <div className="mt-5 space-y-2">
            <div className="text-sm">
              {t("cameraWizard.step2.rtspCandidates")}
            </div>
            <div className="text-sm text-muted-foreground">
              {t("cameraWizard.step2.rtspCandidatesDescription")}
            </div>

            <div className="space-y-2">
              {rtspCandidates.map((candidate, idx) => {
                const isSelected = !!selectedUris?.includes(candidate.uri);
                const candidateTest = candidateTests?.[candidate.uri];
                const isTesting = testingCandidates?.[candidate.uri];

                return (
                  <CandidateItem
                    key={idx}
                    index={idx}
                    candidate={candidate}
                    copiedUri={copiedUri}
                    onCopy={() => handleCopyUri(candidate.uri)}
                    isSelected={isSelected}
                    testCandidate={testCandidate}
                    candidateTest={candidateTest}
                    isTesting={isTesting}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

type CandidateItemProps = {
  candidate: OnvifRtspCandidate;
  index?: number;
  copiedUri: string | null;
  onCopy: () => void;
  isSelected?: boolean;
  testCandidate?: (uri: string) => void;
  candidateTest?: TestResult | { success: false; error: string };
  isTesting?: boolean;
};

function CandidateItem({
  index,
  candidate,
  copiedUri,
  onCopy,
  isSelected,
  testCandidate,
  candidateTest,
  isTesting,
}: CandidateItemProps) {
  const { t } = useTranslation(["views/settings"]);
  const [showFull, setShowFull] = useState(false);

  return (
    <Card
      className={cn(
        isSelected &&
          "outline outline-[3px] -outline-offset-[2.8px] outline-selected duration-200",
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">
                {t("cameraWizard.step2.candidateStreamTitle", {
                  number: (index ?? 0) + 1,
                })}
              </h4>
              {candidateTest?.success && (
                <div className="mt-1 text-sm text-muted-foreground">
                  {[
                    candidateTest.resolution,
                    candidateTest.fps
                      ? `${candidateTest.fps} ${t(
                          "cameraWizard.testResultLabels.fps",
                        )}`
                      : null,
                    candidateTest.videoCodec,
                    candidateTest.audioCodec,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              {candidateTest?.success && (
                <div className="flex items-center gap-2 text-sm">
                  <FaCircleCheck className="size-4 text-success" />
                  <span className="text-success">
                    {t("cameraWizard.step2.connected")}
                  </span>
                </div>
              )}

              {candidateTest && !candidateTest.success && (
                <div className="flex items-center gap-2 text-sm">
                  <LuX className="size-4 text-danger" />
                  <span className="text-danger">
                    {t("cameraWizard.step2.notConnected")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-1 flex items-start gap-2">
            <p
              className="flex-1 cursor-pointer break-all text-sm text-primary-variant hover:underline"
              onClick={() => setShowFull((s) => !s)}
              title={t("cameraWizard.step2.toggleUriView")}
            >
              {showFull ? candidate.uri : maskUri(candidate.uri)}
            </p>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={onCopy}
                className="mr-4 size-8 p-0"
                title={t("cameraWizard.step2.uriCopy")}
              >
                {copiedUri === candidate.uri ? (
                  <FaCheck className="size-3" />
                ) : (
                  <FaCopy className="size-3" />
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={isTesting}
                onClick={() => testCandidate?.(candidate.uri)}
                className="h-8 px-3 text-sm"
              >
                {isTesting ? (
                  <>
                    <ActivityIndicator className="mr-2 size-4" />{" "}
                    {t("cameraWizard.step2.testConnection")}
                  </>
                ) : (
                  t("cameraWizard.step2.testConnection")
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
