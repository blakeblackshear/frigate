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
  FfprobeData,
  FfprobeResponse,
  CandidateTestMap,
} from "@/types/cameraWizard";
import { Label } from "../../ui/label";
import { FaCircleCheck } from "react-icons/fa6";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { isMobile } from "react-device-detect";
import {
  LuInfo,
  LuExternalLink,
  LuCheck,
  LuChevronsUpDown,
} from "react-icons/lu";
import { Link } from "react-router-dom";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Step3StreamConfigProps = {
  wizardData: Partial<WizardFormData>;
  onUpdate: (data: Partial<WizardFormData>) => void;
  onBack?: () => void;
  onNext?: () => void;
  canProceed?: boolean;
};

export default function Step3StreamConfig({
  wizardData,
  onUpdate,
  onBack,
  onNext,
  canProceed,
}: Step3StreamConfigProps) {
  const { t } = useTranslation(["views/settings", "components/dialog"]);
  const { getLocaleDocUrl } = useDocDomain();
  const [testingStreams, setTestingStreams] = useState<Set<string>>(new Set());
  const [openCombobox, setOpenCombobox] = useState<string | null>(null);

  const streams = useMemo(() => wizardData.streams || [], [wizardData.streams]);

  // Probe mode candidate tracking
  const probeCandidates = useMemo(
    () => (wizardData.probeCandidates || []) as string[],
    [wizardData.probeCandidates],
  );

  const candidateTests = useMemo(
    () => (wizardData.candidateTests || {}) as CandidateTestMap,
    [wizardData.candidateTests],
  );

  const isProbeMode = !!wizardData.probeMode;

  const addStream = useCallback(() => {
    const newStreamId = `stream_${Date.now()}`;

    let initialUrl = "";
    if (isProbeMode && probeCandidates.length > 0) {
      // pick first candidate not already used
      const used = new Set(streams.map((s) => s.url).filter(Boolean));
      const firstAvailable = probeCandidates.find((c) => !used.has(c));
      if (firstAvailable) {
        initialUrl = firstAvailable;
      }
    }

    const newStream: StreamConfig = {
      id: newStreamId,
      url: initialUrl,
      roles: [],
      testResult: initialUrl ? candidateTests[initialUrl] : undefined,
      userTested: initialUrl ? !!candidateTests[initialUrl] : false,
    };

    onUpdate({
      streams: [...streams, newStream],
    });
  }, [streams, onUpdate, isProbeMode, probeCandidates, candidateTests]);

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

  const getUsedUrlsExcludingStream = useCallback(
    (excludeStreamId: string) => {
      const used = new Set<string>();
      streams.forEach((s) => {
        if (s.id !== excludeStreamId && s.url) {
          used.add(s.url);
        }
      });
      return used;
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
    async (stream: StreamConfig) => {
      if (!stream.url.trim()) {
        toast.error(t("cameraWizard.commonErrors.noUrl"));
        return;
      }

      setTestingStreams((prev) => new Set(prev).add(stream.id));

      try {
        const response = await axios.get("ffprobe", {
          params: { paths: stream.url, detailed: true },
          timeout: 10000,
        });

        let probeData: FfprobeResponse | null = null;
        if (
          response.data &&
          response.data.length > 0 &&
          response.data[0].return_code === 0
        ) {
          probeData = response.data[0];
        }

        if (!probeData) {
          const error =
            Array.isArray(response.data?.[0]?.stderr) &&
            response.data[0].stderr.length > 0
              ? response.data[0].stderr.join("\n")
              : "Unable to probe stream";
          const failResult: TestResult = { success: false, error };
          updateStream(stream.id, { testResult: failResult, userTested: true });
          onUpdate({
            candidateTests: {
              ...(wizardData.candidateTests || {}),
              [stream.url]: failResult,
            } as CandidateTestMap,
          });
          toast.error(t("cameraWizard.commonErrors.testFailed", { error }));
          return;
        }

        let ffprobeData: FfprobeData;
        if (typeof probeData.stdout === "string") {
          try {
            ffprobeData = JSON.parse(probeData.stdout as string) as FfprobeData;
          } catch {
            ffprobeData = { streams: [] } as FfprobeData;
          }
        } else {
          ffprobeData = probeData.stdout as FfprobeData;
        }

        const streamsArr = ffprobeData.streams || [];

        const videoStream = streamsArr.find(
          (s: FfprobeStream) =>
            s.codec_type === "video" ||
            s.codec_name?.includes("h264") ||
            s.codec_name?.includes("hevc"),
        );

        const audioStream = streamsArr.find(
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

        const testResult: TestResult = {
          success: true,
          resolution,
          videoCodec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name,
          fps: fps && !isNaN(fps) ? fps : undefined,
        };

        updateStream(stream.id, { testResult, userTested: true });
        onUpdate({
          candidateTests: {
            ...(wizardData.candidateTests || {}),
            [stream.url]: testResult,
          } as CandidateTestMap,
        });
        toast.success(t("cameraWizard.step3.testSuccess"));
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
        const catchResult: TestResult = {
          success: false,
          error: errorMessage,
        };
        updateStream(stream.id, { testResult: catchResult, userTested: true });
        onUpdate({
          candidateTests: {
            ...(wizardData.candidateTests || {}),
            [stream.url]: catchResult,
          } as CandidateTestMap,
        });
        toast.error(
          t("cameraWizard.commonErrors.testFailed", { error: errorMessage }),
        );
      } finally {
        setTestingStreams((prev) => {
          const newSet = new Set(prev);
          newSet.delete(stream.id);
          return newSet;
        });
      }
    },
    [updateStream, t, onUpdate, wizardData.candidateTests],
  );

  const setRestream = useCallback(
    (streamId: string) => {
      const stream = streams.find((s) => s.id === streamId);
      if (!stream) return;

      updateStream(streamId, { restream: !stream.restream });
    },
    [streams, updateStream],
  );

  const hasDetectRole = streams.some((s) => s.roles.includes("detect"));

  return (
    <div className="space-y-6">
      <div className="text-sm text-secondary-foreground">
        {t("cameraWizard.step3.description")}
      </div>

      <div className="space-y-4">
        {streams.map((stream, index) => (
          <Card key={stream.id} className="bg-secondary text-primary">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">
                    {t("cameraWizard.step3.streamTitle", { number: index + 1 })}
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
                        {t("cameraWizard.step3.connected")}
                      </span>
                    </div>
                  )}
                  {stream.testResult && !stream.testResult.success && (
                    <div className="flex items-center gap-2 text-sm">
                      <LuX className="size-4 text-danger" />
                      <span className="text-danger">
                        {t("cameraWizard.step3.notConnected")}
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
                    {t("cameraWizard.step3.url")}
                  </label>
                  <div className="flex flex-row items-center gap-2">
                    {isProbeMode && probeCandidates.length > 0 ? (
                      // Responsive: Popover on desktop, Drawer on mobile
                      !isMobile ? (
                        <Popover
                          open={openCombobox === stream.id}
                          onOpenChange={(isOpen) => {
                            setOpenCombobox(isOpen ? stream.id : null);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <div className="min-w-0 flex-1">
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCombobox === stream.id}
                                className="h-8 w-full justify-between overflow-hidden text-left"
                              >
                                <span className="truncate">
                                  {stream.url
                                    ? stream.url
                                    : t("cameraWizard.step3.selectStream")}
                                </span>
                                <LuChevronsUpDown className="ml-2 size-6 opacity-50" />
                              </Button>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-2"
                            disablePortal
                          >
                            <Command>
                              <CommandInput
                                placeholder={t(
                                  "cameraWizard.step3.searchCandidates",
                                )}
                                className="h-9"
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {t("cameraWizard.step3.noStreamFound")}
                                </CommandEmpty>
                                <CommandGroup>
                                  {probeCandidates
                                    .filter((c) => {
                                      const used = getUsedUrlsExcludingStream(
                                        stream.id,
                                      );
                                      return !used.has(c);
                                    })
                                    .map((candidate) => (
                                      <CommandItem
                                        key={candidate}
                                        value={candidate}
                                        onSelect={() => {
                                          updateStream(stream.id, {
                                            url: candidate,
                                            testResult:
                                              candidateTests[candidate] ||
                                              undefined,
                                            userTested:
                                              !!candidateTests[candidate],
                                          });
                                          setOpenCombobox(null);
                                        }}
                                      >
                                        <LuCheck
                                          className={cn(
                                            "mr-3 size-5",
                                            stream.url === candidate
                                              ? "opacity-100"
                                              : "opacity-0",
                                          )}
                                        />
                                        {candidate}
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Drawer
                          open={openCombobox === stream.id}
                          onOpenChange={(isOpen) =>
                            setOpenCombobox(isOpen ? stream.id : null)
                          }
                        >
                          <DrawerTrigger asChild>
                            <div className="min-w-0 flex-1">
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCombobox === stream.id}
                                className="h-8 w-full justify-between overflow-hidden text-left"
                              >
                                <span className="truncate">
                                  {stream.url
                                    ? stream.url
                                    : t("cameraWizard.step3.selectStream")}
                                </span>
                                <LuChevronsUpDown className="ml-2 size-6 opacity-50" />
                              </Button>
                            </div>
                          </DrawerTrigger>
                          <DrawerContent className="mx-1 max-h-[75dvh] overflow-hidden rounded-t-2xl px-2">
                            <div className="mt-2">
                              <Command>
                                <CommandInput
                                  placeholder={t(
                                    "cameraWizard.step3.searchCandidates",
                                  )}
                                  className="h-9"
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    {t("cameraWizard.step3.noStreamFound")}
                                  </CommandEmpty>
                                  <CommandGroup>
                                    {probeCandidates
                                      .filter((c) => {
                                        const used = getUsedUrlsExcludingStream(
                                          stream.id,
                                        );
                                        return !used.has(c);
                                      })
                                      .map((candidate) => (
                                        <CommandItem
                                          key={candidate}
                                          value={candidate}
                                          onSelect={() => {
                                            updateStream(stream.id, {
                                              url: candidate,
                                              testResult:
                                                candidateTests[candidate] ||
                                                undefined,
                                              userTested:
                                                !!candidateTests[candidate],
                                            });
                                            setOpenCombobox(null);
                                          }}
                                        >
                                          <LuCheck
                                            className={cn(
                                              "mr-3 size-5",
                                              stream.url === candidate
                                                ? "opacity-100"
                                                : "opacity-0",
                                            )}
                                          />
                                          {candidate}
                                        </CommandItem>
                                      ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </div>
                          </DrawerContent>
                        </Drawer>
                      )
                    ) : (
                      <Input
                        value={stream.url}
                        onChange={(e) =>
                          updateStream(stream.id, {
                            url: e.target.value,
                            testResult: undefined,
                          })
                        }
                        className="h-8 flex-1"
                        placeholder={t(
                          "cameraWizard.step3.streamUrlPlaceholder",
                        )}
                      />
                    )}
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
                      {t("cameraWizard.step3.testStream")}
                    </Button>
                  </div>
                </div>
              </div>

              {stream.testResult &&
                !stream.testResult.success &&
                stream.userTested && (
                  <div className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
                    <div className="font-medium">
                      {t("cameraWizard.step3.testFailedTitle")}
                    </div>
                    <div className="mt-1 text-xs">
                      {stream.testResult.error}
                    </div>
                  </div>
                )}

              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Label className="text-sm font-medium text-primary-variant">
                    {t("cameraWizard.step3.roles")}
                  </Label>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                        <LuInfo className="size-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="pointer-events-auto w-80 text-xs">
                      <div className="space-y-2">
                        <div className="font-medium">
                          {t("cameraWizard.step3.rolesPopover.title")}
                        </div>
                        <div className="space-y-1 text-muted-foreground">
                          <div>
                            <strong>detect</strong> -{" "}
                            {t("cameraWizard.step3.rolesPopover.detect")}
                          </div>
                          <div>
                            <strong>record</strong> -{" "}
                            {t("cameraWizard.step3.rolesPopover.record")}
                          </div>
                          <div>
                            <strong>audio</strong> -{" "}
                            {t("cameraWizard.step3.rolesPopover.audio")}
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
                    {t("cameraWizard.step3.featuresTitle")}
                  </Label>
                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0">
                        <LuInfo className="size-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="pointer-events-auto w-80 text-xs">
                      <div className="space-y-2">
                        <div className="font-medium">
                          {t("cameraWizard.step3.featuresPopover.title")}
                        </div>
                        <div className="text-muted-foreground">
                          {t("cameraWizard.step3.featuresPopover.description")}
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
                      {t("cameraWizard.step3.go2rtc")}
                    </span>
                    <Switch
                      checked={stream.restream || false}
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
          {t("cameraWizard.step3.addAnotherStream")}
        </Button>
      </div>

      {!hasDetectRole && (
        <div className="rounded-lg border border-danger/50 p-3 text-sm text-danger">
          {t("cameraWizard.step3.detectRoleWarning")}
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
            disabled={!canProceed || testingStreams.size > 0}
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
