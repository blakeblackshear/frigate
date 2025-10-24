import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useMemo } from "react";
import { LuPlus, LuTrash2, LuX } from "react-icons/lu";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import axios from "axios";
import { toast } from "sonner";
import {
  WizardFormData,
  StreamConfig,
  StreamRole,
  TestResult,
  FfprobeStream,
} from "@/types/cameraWizard";
import { Label } from "../../ui/label";
import { FaCircleCheck } from "react-icons/fa6";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LuInfo, LuExternalLink } from "react-icons/lu";
import { Link } from "react-router-dom";
import { useDocDomain } from "@/hooks/use-doc-domain";

type Step2StreamConfigProps = {
  wizardData: Partial<WizardFormData>;
  onUpdate: (data: Partial<WizardFormData>) => void;
  onBack?: () => void;
  onNext?: () => void;
  canProceed?: boolean;
};

export default function Step2StreamConfig({
  wizardData,
  onUpdate,
  onBack,
  onNext,
  canProceed,
}: Step2StreamConfigProps) {
  const { t } = useTranslation(["views/settings", "components/dialog"]);
  const { getLocaleDocUrl } = useDocDomain();
  const [testingStreams, setTestingStreams] = useState<Set<string>>(new Set());

  const streams = useMemo(() => wizardData.streams || [], [wizardData.streams]);

  const addStream = useCallback(() => {
    const newStream: StreamConfig = {
      id: `stream_${Date.now()}`,
      url: "",
      roles: [],
    };
    onUpdate({
      streams: [...streams, newStream],
    });
  }, [streams, onUpdate]);

  const removeStream = useCallback(
    (streamId: string) => {
      onUpdate({
        streams: streams.filter((s) => s.id !== streamId),
      });
    },
    [streams, onUpdate],
  );

  const updateStream = useCallback(
    (streamId: string, updates: Partial<StreamConfig>) => {
      onUpdate({
        streams: streams.map((s) =>
          s.id === streamId ? { ...s, ...updates } : s,
        ),
      });
    },
    [streams, onUpdate],
  );

  const getUsedRolesExcludingStream = useCallback(
    (excludeStreamId: string) => {
      const roles = new Set<StreamRole>();
      streams.forEach((stream) => {
        if (stream.id !== excludeStreamId) {
          stream.roles.forEach((role) => roles.add(role));
        }
      });
      return roles;
    },
    [streams],
  );

  const toggleRole = useCallback(
    (streamId: string, role: StreamRole) => {
      const stream = streams.find((s) => s.id === streamId);
      if (!stream) return;

      const hasRole = stream.roles.includes(role);
      if (hasRole) {
        // Allow removing the role
        const newRoles = stream.roles.filter((r) => r !== role);
        updateStream(streamId, { roles: newRoles });
      } else {
        // Check if role is already used in another stream
        const usedRoles = getUsedRolesExcludingStream(streamId);
        if (!usedRoles.has(role)) {
          // Allow adding the role
          const newRoles = [...stream.roles, role];
          updateStream(streamId, { roles: newRoles });
        }
      }
    },
    [streams, updateStream, getUsedRolesExcludingStream],
  );

  const testStream = useCallback(
    (stream: StreamConfig) => {
      if (!stream.url.trim()) {
        toast.error(t("cameraWizard.commonErrors.noUrl"));
        return;
      }

      setTestingStreams((prev) => new Set(prev).add(stream.id));

      axios
        .get("ffprobe", {
          params: { paths: stream.url, detailed: true },
          timeout: 10000,
        })
        .then((response) => {
          if (response.data?.[0]?.return_code === 0) {
            const probeData = response.data[0];
            const streams = probeData.stdout.streams || [];

            const videoStream = streams.find(
              (s: FfprobeStream) =>
                s.codec_type === "video" ||
                s.codec_name?.includes("h264") ||
                s.codec_name?.includes("h265"),
            );

            const audioStream = streams.find(
              (s: FfprobeStream) =>
                s.codec_type === "audio" ||
                s.codec_name?.includes("aac") ||
                s.codec_name?.includes("mp3"),
            );

            const resolution = videoStream
              ? `${videoStream.width}x${videoStream.height}`
              : undefined;

            const fps = videoStream?.avg_frame_rate
              ? parseFloat(videoStream.avg_frame_rate.split("/")[0]) /
                parseFloat(videoStream.avg_frame_rate.split("/")[1])
              : undefined;

            const testResult: TestResult = {
              success: true,
              resolution,
              videoCodec: videoStream?.codec_name,
              audioCodec: audioStream?.codec_name,
              fps: fps && !isNaN(fps) ? fps : undefined,
            };

            updateStream(stream.id, { testResult, userTested: true });
            toast.success(t("cameraWizard.step2.testSuccess"));
          } else {
            const error = response.data?.[0]?.stderr || "Unknown error";
            updateStream(stream.id, {
              testResult: { success: false, error },
              userTested: true,
            });
            toast.error(t("cameraWizard.commonErrors.testFailed", { error }));
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Connection failed";
          updateStream(stream.id, {
            testResult: { success: false, error: errorMessage },
            userTested: true,
          });
          toast.error(
            t("cameraWizard.commonErrors.testFailed", { error: errorMessage }),
          );
        })
        .finally(() => {
          setTestingStreams((prev) => {
            const newSet = new Set(prev);
            newSet.delete(stream.id);
            return newSet;
          });
        });
    },
    [updateStream, t],
  );

  const setRestream = useCallback(
    (streamId: string) => {
      const currentIds = wizardData.restreamIds || [];
      const isSelected = currentIds.includes(streamId);
      const newIds = isSelected
        ? currentIds.filter((id) => id !== streamId)
        : [...currentIds, streamId];
      onUpdate({
        restreamIds: newIds,
      });
    },
    [wizardData.restreamIds, onUpdate],
  );

  const hasDetectRole = streams.some((s) => s.roles.includes("detect"));

  return (
    <div className="space-y-6">
      <div className="text-sm text-secondary-foreground">
        {t("cameraWizard.step2.description")}
      </div>

      <div className="space-y-4">
        {streams.map((stream, index) => (
          <Card key={stream.id} className="bg-secondary text-primary">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">
                    {t("cameraWizard.step2.streamTitle", { number: index + 1 })}
                  </h4>
                  {stream.testResult && stream.testResult.success && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {[
                        stream.testResult.resolution,
                        stream.testResult.fps
                          ? `${stream.testResult.fps} ${t("cameraWizard.testResultLabels.fps")}`
                          : null,
                        stream.testResult.videoCodec,
                        stream.testResult.audioCodec,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {stream.testResult?.success && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaCircleCheck className="size-4 text-success" />
                      <span className="text-success">
                        {t("cameraWizard.step2.connected")}
                      </span>
                    </div>
                  )}
                  {stream.testResult && !stream.testResult.success && (
                    <div className="flex items-center gap-2 text-sm">
                      <LuX className="size-4 text-danger" />
                      <span className="text-danger">
                        {t("cameraWizard.step2.notConnected")}
                      </span>
                    </div>
                  )}
                  {streams.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStream(stream.id)}
                      className="text-secondary-foreground hover:text-secondary-foreground"
                    >
                      <LuTrash2 className="size-5" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-primary-variant">
                    {t("cameraWizard.step2.url")}
                  </label>
                  <div className="flex flex-row items-center gap-2">
                    <Input
                      value={stream.url}
                      onChange={(e) =>
                        updateStream(stream.id, {
                          url: e.target.value,
                          testResult: undefined,
                        })
                      }
                      className="h-8 flex-1"
                      placeholder={t("cameraWizard.step2.streamUrlPlaceholder")}
                    />
                    <Button
                      type="button"
                      onClick={() => testStream(stream)}
                      disabled={
                        testingStreams.has(stream.id) || !stream.url.trim()
                      }
                      variant="outline"
                      size="sm"
                    >
                      {testingStreams.has(stream.id) && (
                        <ActivityIndicator className="mr-2 size-4" />
                      )}
                      {t("cameraWizard.step2.testStream")}
                    </Button>
                  </div>
                </div>
              </div>

              {stream.testResult &&
                !stream.testResult.success &&
                stream.userTested && (
                  <div className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
                    <div className="font-medium">
                      {t("cameraWizard.step2.testFailedTitle")}
                    </div>
                    <div className="mt-1 text-xs">
                      {stream.testResult.error}
                    </div>
                  </div>
                )}

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-sm font-medium text-primary-variant">
                    {t("cameraWizard.step2.roles")}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                        <LuInfo className="size-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="pointer-events-auto w-80 text-xs">
                      <div className="space-y-2">
                        <div className="font-medium">
                          {t("cameraWizard.step2.rolesPopover.title")}
                        </div>
                        <div className="space-y-1 text-muted-foreground">
                          <div>
                            <strong>detect</strong> -{" "}
                            {t("cameraWizard.step2.rolesPopover.detect")}
                          </div>
                          <div>
                            <strong>record</strong> -{" "}
                            {t("cameraWizard.step2.rolesPopover.record")}
                          </div>
                          <div>
                            <strong>audio</strong> -{" "}
                            {t("cameraWizard.step2.rolesPopover.audio")}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center text-primary">
                          <Link
                            to={getLocaleDocUrl("configuration/cameras")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline"
                          >
                            {t("readTheDocumentation", { ns: "common" })}
                            <LuExternalLink className="ml-2 inline-flex size-3" />
                          </Link>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="rounded-lg bg-background p-3">
                  <div className="flex flex-wrap gap-2">
                    {(["detect", "record", "audio"] as const).map((role) => {
                      const isUsedElsewhere = getUsedRolesExcludingStream(
                        stream.id,
                      ).has(role);
                      const isChecked = stream.roles.includes(role);
                      return (
                        <div
                          key={role}
                          className="flex w-full items-center justify-between"
                        >
                          <span className="text-sm capitalize">{role}</span>
                          <Switch
                            checked={isChecked}
                            onCheckedChange={() => toggleRole(stream.id, role)}
                            disabled={!isChecked && isUsedElsewhere}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-sm font-medium text-primary-variant">
                    {t("cameraWizard.step2.featuresTitle")}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                        <LuInfo className="size-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="pointer-events-auto w-80 text-xs">
                      <div className="space-y-2">
                        <div className="font-medium">
                          {t("cameraWizard.step2.featuresPopover.title")}
                        </div>
                        <div className="text-muted-foreground">
                          {t("cameraWizard.step2.featuresPopover.description")}
                        </div>
                        <div className="mt-3 flex items-center text-primary">
                          <Link
                            to={getLocaleDocUrl(
                              "configuration/restream#reduce-connections-to-camera",
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline"
                          >
                            {t("readTheDocumentation", { ns: "common" })}
                            <LuExternalLink className="ml-2 inline-flex size-3" />
                          </Link>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="rounded-lg bg-background p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {t("cameraWizard.step2.go2rtc")}
                    </span>
                    <Switch
                      checked={(wizardData.restreamIds || []).includes(
                        stream.id,
                      )}
                      onCheckedChange={() => setRestream(stream.id)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          onClick={addStream}
          variant="outline"
          className=""
        >
          <LuPlus className="mr-2 size-4" />
          {t("cameraWizard.step2.addAnotherStream")}
        </Button>
      </div>

      {!hasDetectRole && (
        <div className="rounded-lg border border-danger/50 p-3 text-sm text-danger">
          {t("cameraWizard.step2.detectRoleWarning")}
        </div>
      )}

      <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-4">
        {onBack && (
          <Button type="button" onClick={onBack} className="sm:flex-1">
            {t("button.back", { ns: "common" })}
          </Button>
        )}
        {onNext && (
          <Button
            type="button"
            onClick={() => onNext?.()}
            disabled={!canProceed}
            variant="select"
            className="sm:flex-1"
          >
            {t("button.next", { ns: "common" })}
          </Button>
        )}
      </div>
    </div>
  );
}
