import { useTranslation } from "react-i18next";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { FaExclamationCircle, FaCopy, FaCheck } from "react-icons/fa";
import { useState } from "react";
import { toast } from "sonner";
import type {
  OnvifProbeResponse,
  OnvifRtspCandidate,
  TestResult,
  CandidateTestMap,
} from "@/types/cameraWizard";

type OnvifProbeResultsProps = {
  isLoading: boolean;
  isError: boolean;
  error?: string;
  probeResult?: OnvifProbeResponse;
  onSelectCandidate: (uri: string) => void;
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
  onSelectCandidate,
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
    toast.success(t("cameraWizard.step1.uriCopied"));
    setTimeout(() => setCopiedUri(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <ActivityIndicator className="size-6" />
        <p className="text-sm text-muted-foreground">
          {t("cameraWizard.step1.probingDevice")}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <FaExclamationCircle className="mt-1 size-5 flex-shrink-0 text-destructive" />
          <div className="space-y-1">
            <h3 className="font-medium text-destructive">
              {t("cameraWizard.step1.probeError")}
            </h3>
            {error && <p className="text-sm text-muted-foreground">{error}</p>}
          </div>
        </div>
        <Button onClick={onRetry} variant="outline" className="w-full">
          {t("button.retry", { ns: "common" })}
        </Button>
      </div>
    );
  }

  if (!probeResult?.success) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <FaExclamationCircle className="mt-1 size-5 flex-shrink-0 text-amber-600" />
          <div className="space-y-1">
            <h3 className="font-medium text-amber-900">
              {t("cameraWizard.step1.probeNoSuccess")}
            </h3>
            {probeResult?.message && (
              <p className="text-sm text-muted-foreground">
                {probeResult.message}
              </p>
            )}
          </div>
        </div>
        <Button onClick={onRetry} variant="outline" className="w-full">
          {t("button.retry", { ns: "common" })}
        </Button>
      </div>
    );
  }

  const rtspCandidates = probeResult.rtsp_candidates || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle className="border-b p-4 text-sm">
          {t("cameraWizard.step1.deviceInfo")}
        </CardTitle>
        <CardContent className="space-y-2 p-4 text-sm">
          {probeResult.manufacturer && (
            <div>
              <span className="text-muted-foreground">Manufacturer:</span>{" "}
              <span className="font-medium">{probeResult.manufacturer}</span>
            </div>
          )}
          {probeResult.model && (
            <div>
              <span className="text-muted-foreground">Model:</span>{" "}
              <span className="font-medium">{probeResult.model}</span>
            </div>
          )}
          {probeResult.firmware_version && (
            <div>
              <span className="text-muted-foreground">Firmware:</span>{" "}
              <span className="font-medium">
                {probeResult.firmware_version}
              </span>
            </div>
          )}
          {probeResult.profiles_count !== undefined && (
            <div>
              <span className="text-muted-foreground">Profiles:</span>{" "}
              <span className="font-medium">{probeResult.profiles_count}</span>
            </div>
          )}
          {probeResult.ptz_supported !== undefined && (
            <div>
              <span className="text-muted-foreground">PTZ Support:</span>{" "}
              <span className="font-medium">
                {probeResult.ptz_supported ? "Yes" : "No"}
              </span>
            </div>
          )}
          {probeResult.ptz_supported && probeResult.autotrack_supported && (
            <div>
              <span className="text-muted-foreground">Autotrack Support:</span>{" "}
              <span className="font-medium">Yes</span>
            </div>
          )}
          {probeResult.ptz_supported &&
            probeResult.presets_count !== undefined && (
              <div>
                <span className="text-muted-foreground">Presets:</span>{" "}
                <span className="font-medium">{probeResult.presets_count}</span>
              </div>
            )}
        </CardContent>
      </Card>

      {rtspCandidates.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">
            {t("cameraWizard.step1.rtspCandidates")}
          </h3>

          <div className="space-y-2">
            {rtspCandidates.map((candidate, idx) => {
              const isSelected = !!selectedUris?.includes(candidate.uri);
              const candidateTest = candidateTests?.[candidate.uri];
              const isTesting = testingCandidates?.[candidate.uri];

              return (
                <CandidateItem
                  key={idx}
                  candidate={candidate}
                  copiedUri={copiedUri}
                  onCopy={() => handleCopyUri(candidate.uri)}
                  onUse={() => onSelectCandidate(candidate.uri)}
                  isSelected={isSelected}
                  onTest={() => testCandidate && testCandidate(candidate.uri)}
                  candidateTest={candidateTest}
                  isTesting={isTesting}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type CandidateItemProps = {
  candidate: OnvifRtspCandidate;
  isTested?: boolean;
  copiedUri: string | null;
  onCopy: () => void;
  onUse: () => void;
  isSelected?: boolean;
  onTest?: () => void;
  candidateTest?: TestResult | { success: false; error: string };
  isTesting?: boolean;
};

function CandidateItem({
  candidate,
  isTested,
  copiedUri,
  onCopy,
  onUse,
  isSelected,
  onTest,
  candidateTest,
  isTesting,
}: CandidateItemProps) {
  const { t } = useTranslation(["views/settings"]);
  const [showFull, setShowFull] = useState(false);

  // Mask credentials for display
  const maskUri = (uri: string) => {
    const match = uri.match(/rtsp:\/\/([^:]+):([^@]+)@(.+)/);
    if (match) {
      return `rtsp://${match[1]}:••••@${match[3]}`;
    }
    return uri;
  };

  return (
    <div
      className={`rounded-lg border p-3 ${
        isSelected ? "border-selected bg-selected/10" : "border-input bg-card"
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isTested !== undefined && (
                <span
                  className={`text-xs font-medium ${
                    isTested ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isTested ? "✓ OK" : "✗ Failed"}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <p
                className="cursor-pointer break-all text-xs text-muted-foreground hover:underline"
                onClick={() => setShowFull(!showFull)}
                title="Click to toggle masked/full view"
              >
                {showFull ? candidate.uri : maskUri(candidate.uri)}
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCopy}
                className="h-7 w-7 p-0"
                title="Copy URI"
              >
                {copiedUri === candidate.uri ? (
                  <FaCheck className="size-3" />
                ) : (
                  <FaCopy className="size-3" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button
              size="sm"
              onClick={onTest}
              variant="outline"
              className="h-7 px-3 text-xs"
            >
              {isTesting ? (
                <ActivityIndicator className="size-3" />
              ) : (
                t("cameraWizard.step1.test")
              )}
            </Button>
            <Button
              size="sm"
              onClick={onUse}
              variant="default"
              className="h-7 px-3 text-xs"
            >
              {t("cameraWizard.step1.useCandidate")}
            </Button>
          </div>
        </div>
        {candidateTest && candidateTest.success && (
          <div className="text-xs text-muted-foreground">
            {candidateTest.resolution && (
              <span className="mr-2">
                {`${t("cameraWizard.testResultLabels.resolution")} ${candidateTest.resolution}`}
              </span>
            )}
            {candidateTest.fps && (
              <span className="mr-2">
                {t("cameraWizard.testResultLabels.fps")} {candidateTest.fps}
              </span>
            )}
            {candidateTest.videoCodec && (
              <span className="mr-2">
                {`${t("cameraWizard.testResultLabels.video")} ${candidateTest.videoCodec}`}
              </span>
            )}
            {candidateTest.audioCodec && (
              <span className="mr-2">
                {`${t("cameraWizard.testResultLabels.audio")} ${candidateTest.audioCodec}`}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
