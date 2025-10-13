import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useMemo } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import axios from "axios";
import { toast } from "sonner";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  WizardFormData,
  CameraBrand,
  CAMERA_BRANDS,
  CAMERA_BRAND_VALUES,
  TestResult,
  FfprobeStream,
  StreamRole,
  StreamConfig,
} from "@/types/cameraWizard";
import { FaCircleCheck } from "react-icons/fa6";
import { Card, CardContent, CardTitle } from "../../ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LuInfo } from "react-icons/lu";
import { detectReolinkCamera } from "@/utils/cameraUtil";

type Step1NameCameraProps = {
  wizardData: Partial<WizardFormData>;
  onUpdate: (data: Partial<WizardFormData>) => void;
  onNext: (data?: Partial<WizardFormData>) => void;
  onCancel: () => void;
  canProceed?: boolean;
};

export default function Step1NameCamera({
  wizardData,
  onUpdate,
  onNext,
  onCancel,
}: Step1NameCameraProps) {
  const { t } = useTranslation(["views/settings"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const existingCameraNames = useMemo(() => {
    if (!config?.cameras) {
      return [];
    }
    return Object.keys(config.cameras);
  }, [config]);

  const step1FormData = z
    .object({
      cameraName: z
        .string()
        .min(1, t("cameraWizard.step1.errors.nameRequired"))
        .max(64, t("cameraWizard.step1.errors.nameLength"))
        .regex(
          /^[a-zA-Z0-9\s_-]+$/,
          t("cameraWizard.step1.errors.invalidCharacters"),
        )
        .refine(
          (value) => !existingCameraNames.includes(value),
          t("cameraWizard.step1.errors.nameExists"),
        ),
      host: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      brandTemplate: z.enum(CAMERA_BRAND_VALUES).optional(),
      customUrl: z.string().optional(),
    })
    .refine(
      (data) => {
        // If brand is "other", customUrl is required
        if (data.brandTemplate === "other") {
          return data.customUrl && data.customUrl.trim().length > 0;
        }
        // If brand is not "other", host is required
        return data.host && data.host.trim().length > 0;
      },
      {
        message: t("cameraWizard.step1.errors.brandOrCustomUrlRequired"),
        path: ["customUrl"],
      },
    );

  const form = useForm<z.infer<typeof step1FormData>>({
    resolver: zodResolver(step1FormData),
    defaultValues: {
      cameraName: wizardData.cameraName || "",
      host: wizardData.host || "",
      username: wizardData.username || "",
      password: wizardData.password || "",
      brandTemplate:
        wizardData.brandTemplate &&
        CAMERA_BRAND_VALUES.includes(wizardData.brandTemplate as CameraBrand)
          ? (wizardData.brandTemplate as CameraBrand)
          : "dahua",
      customUrl: wizardData.customUrl || "",
    },
    mode: "onChange",
  });

  const watchedBrand = form.watch("brandTemplate");
  const watchedHost = form.watch("host");
  const watchedCustomUrl = form.watch("customUrl");

  const isTestButtonEnabled =
    watchedBrand === "other"
      ? !!(watchedCustomUrl && watchedCustomUrl.trim())
      : !!(watchedHost && watchedHost.trim());

  const generateDynamicStreamUrl = useCallback(
    async (data: z.infer<typeof step1FormData>): Promise<string | null> => {
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

      // Use detected protocol or fallback to rtsp
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
    async (data: z.infer<typeof step1FormData>): Promise<string> => {
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

  const testConnection = useCallback(async () => {
    const data = form.getValues();
    const streamUrl = await generateStreamUrl(data);

    if (!streamUrl) {
      toast.error(t("cameraWizard.commonErrors.noUrl"));
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    // First get probe data for metadata
    const probePromise = axios.get("ffprobe", {
      params: { paths: streamUrl, detailed: true },
      timeout: 10000,
    });

    // Then get snapshot for preview
    const snapshotPromise = axios.get("ffprobe/snapshot", {
      params: { url: streamUrl },
      responseType: "blob",
      timeout: 10000,
    });

    try {
      // First get probe data for metadata
      const probeResponse = await probePromise;
      let probeData = null;
      if (
        probeResponse.data &&
        probeResponse.data.length > 0 &&
        probeResponse.data[0].return_code === 0
      ) {
        probeData = probeResponse.data[0];
      }

      // Then get snapshot for preview (only if probe succeeded)
      let snapshotBlob = null;
      if (probeData) {
        try {
          const snapshotResponse = await snapshotPromise;
          snapshotBlob = snapshotResponse.data;
        } catch (snapshotError) {
          // Snapshot is optional, don't fail if it doesn't work
          toast.warning(t("cameraWizard.step1.warnings.noSnapshot"));
        }
      }

      if (probeData) {
        const ffprobeData = probeData.stdout;
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

        const resolution = videoStream
          ? `${videoStream.width}x${videoStream.height}`
          : undefined;

        // Extract FPS from rational (e.g., "15/1" -> 15)
        const fps = videoStream?.avg_frame_rate
          ? parseFloat(videoStream.avg_frame_rate.split("/")[0]) /
            parseFloat(videoStream.avg_frame_rate.split("/")[1])
          : undefined;

        // Convert snapshot blob to base64 if available
        let snapshotBase64 = undefined;
        if (snapshotBlob) {
          snapshotBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(snapshotBlob);
          });
        }

        const testResult: TestResult = {
          success: true,
          snapshot: snapshotBase64,
          resolution,
          videoCodec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name,
          fps: fps && !isNaN(fps) ? fps : undefined,
        };

        setTestResult(testResult);
        toast.success(t("cameraWizard.step1.testSuccess"));
      } else {
        const error = probeData?.stderr || "Unknown error";
        setTestResult({
          success: false,
          error: error,
        });
        toast.error(t("cameraWizard.commonErrors.testFailed", { error }));
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
      toast.error(
        t("cameraWizard.commonErrors.testFailed", { error: errorMessage }),
      );
    } finally {
      setIsTesting(false);
    }
  }, [form, generateStreamUrl, t]);

  const onSubmit = (data: z.infer<typeof step1FormData>) => {
    onUpdate(data);
  };

  const handleContinue = useCallback(async () => {
    const data = form.getValues();
    const streamUrl = await generateStreamUrl(data);
    const streamId = `stream_${Date.now()}`;

    const streamConfig: StreamConfig = {
      id: streamId,
      url: streamUrl,
      roles: ["detect" as StreamRole],
      resolution: testResult?.resolution,
      testResult: testResult || undefined,
      userTested: false,
    };

    const updatedData = {
      ...data,
      streams: [streamConfig],
    };

    onNext(updatedData);
  }, [form, generateStreamUrl, testResult, onNext]);

  return (
    <div className="space-y-6">
      {!testResult?.success && (
        <>
          <div className="text-sm text-muted-foreground">
            {t("cameraWizard.step1.description")}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="cameraName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("cameraWizard.step1.cameraName")}</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8"
                        placeholder={t(
                          "cameraWizard.step1.cameraNamePlaceholder",
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="brandTemplate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("cameraWizard.step1.cameraBrand")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8">
                          <SelectValue
                            placeholder={t("cameraWizard.step1.selectBrand")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CAMERA_BRANDS.map((brand) => (
                          <SelectItem key={brand.value} value={brand.value}>
                            {brand.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    {field.value &&
                      (() => {
                        const selectedBrand = CAMERA_BRANDS.find(
                          (brand) => brand.value === field.value,
                        );
                        return selectedBrand &&
                          selectedBrand.value != "other" ? (
                          <FormDescription className="mt-1 pt-0.5 text-xs text-muted-foreground">
                            <Popover>
                              <PopoverTrigger>
                                <div className="flex flex-row items-center gap-0.5 text-xs text-muted-foreground hover:text-primary">
                                  <LuInfo className="mr-1 size-3" />
                                  {t("cameraWizard.step1.brandInformation")}
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="font-medium">
                                    {selectedBrand.label}
                                  </h4>
                                  <p className="break-all text-sm text-muted-foreground">
                                    {t("cameraWizard.step1.brandUrlFormat", {
                                      exampleUrl: selectedBrand.exampleUrl,
                                    })}
                                  </p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </FormDescription>
                        ) : null;
                      })()}
                  </FormItem>
                )}
              />

              {watchedBrand !== "other" && (
                <>
                  <FormField
                    control={form.control}
                    name="host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("cameraWizard.step1.host")}</FormLabel>
                        <FormControl>
                          <Input
                            className="h-8"
                            placeholder="192.168.1.100"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("cameraWizard.step1.username")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            className="h-8"
                            placeholder={t(
                              "cameraWizard.step1.usernamePlaceholder",
                            )}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {t("cameraWizard.step1.password")}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              className="h-8 pr-10"
                              type={showPassword ? "text" : "password"}
                              placeholder={t(
                                "cameraWizard.step1.passwordPlaceholder",
                              )}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <LuEyeOff className="size-4" />
                              ) : (
                                <LuEye className="size-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {watchedBrand == "other" && (
                <FormField
                  control={form.control}
                  name="customUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("cameraWizard.step1.customUrl")}</FormLabel>
                      <FormControl>
                        <Input
                          className="h-8"
                          placeholder="rtsp://username:password@host:port/path"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </form>
          </Form>
        </>
      )}

      {testResult?.success && (
        <div className="p-4">
          <div className="mb-3 flex flex-row items-center gap-2 text-sm font-medium text-success">
            <FaCircleCheck className="size-4" />
            {t("cameraWizard.step1.testSuccess")}
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
                  {t("cameraWizard.step1.streamDetails")}
                </CardTitle>
                <CardContent className="p-0 text-sm">
                  <StreamDetails testResult={testResult} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
        <Button
          type="button"
          onClick={testResult?.success ? () => setTestResult(null) : onCancel}
          className="sm:flex-1"
        >
          {testResult?.success
            ? t("button.back", { ns: "common" })
            : t("button.cancel", { ns: "common" })}
        </Button>
        {testResult?.success ? (
          <Button
            type="button"
            onClick={handleContinue}
            variant="select"
            className="flex items-center justify-center gap-2 sm:flex-1"
          >
            {t("button.continue", { ns: "common" })}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={testConnection}
            disabled={isTesting || !isTestButtonEnabled}
            variant="select"
            className="flex items-center justify-center gap-2 sm:flex-1"
          >
            {isTesting && <ActivityIndicator className="size-4" />}
            {t("cameraWizard.step1.testConnection")}
          </Button>
        )}
      </div>
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
