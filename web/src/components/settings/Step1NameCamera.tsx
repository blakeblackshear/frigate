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
} from "@/types/cameraWizard";

type Step1NameCameraProps = {
  wizardData: Partial<WizardFormData>;
  onUpdate: (data: Partial<WizardFormData>) => void;
  onCancel: () => void;
};

export default function Step1NameCamera({
  wizardData,
  onUpdate,
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
        .min(1, "Camera name is required")
        .max(64, "Camera name must be 64 characters or less")
        .regex(/^[a-zA-Z0-9\s_-]+$/, "Camera name contains invalid characters")
        .refine(
          (value) => !existingCameraNames.includes(value),
          "Camera name already exists",
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
          : "hikvision",
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

  const generateStreamUrl = useCallback(
    (data: z.infer<typeof step1FormData>): string => {
      if (data.brandTemplate === "other") {
        return data.customUrl || "";
      }

      const brand = CAMERA_BRANDS.find((b) => b.value === data.brandTemplate);
      if (!brand || !data.host) return "";

      return brand.template
        .replace("{username}", data.username || "")
        .replace("{password}", data.password || "")
        .replace("{host}", data.host);
    },
    [],
  );

  const testConnection = useCallback(async () => {
    const data = form.getValues();
    const streamUrl = generateStreamUrl(data);

    if (!streamUrl) {
      toast.error(t("cameraWizard.step1.errors.noUrl"));
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    await axios
      .get("ffprobe", {
        params: { paths: streamUrl, detailed: true },
        timeout: 10000,
      })
      .then((response) => {
        if (
          response.data &&
          response.data.length > 0 &&
          response.data[0].return_code === 0
        ) {
          const probeData = response.data[0];
          const ffprobeData = probeData.stdout;
          const streams = ffprobeData.streams || [];

          // Extract video stream info
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

          // Calculate resolution
          const resolution = videoStream
            ? `${videoStream.width}x${videoStream.height}`
            : undefined;

          // Extract FPS from rational (e.g., "15/1" -> 15)
          const fps = videoStream?.r_frame_rate
            ? parseFloat(videoStream.r_frame_rate.split("/")[0]) /
              parseFloat(videoStream.r_frame_rate.split("/")[1])
            : undefined;

          const testResult: TestResult = {
            success: true,
            resolution,
            videoCodec: videoStream?.codec_name,
            audioCodec: audioStream?.codec_name,
            fps: fps && !isNaN(fps) ? fps : undefined,
          };

          setTestResult(testResult);
          toast.success(t("cameraWizard.step1.testSuccess"));

          // Auto-populate stream if successful
          const streamId = `stream_${Date.now()}`;
          onUpdate({
            ...data,
            streams: [
              {
                id: streamId,
                url: streamUrl,
                roles: ["detect"],
                resolution: testResult.resolution,
                testResult,
              },
            ],
          });
        } else {
          const error = response.data?.[0]?.stderr || "Unknown error";
          setTestResult({
            success: false,
            error: error,
          });
          toast.error(t("cameraWizard.step1.testFailed", { error }));
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Connection failed";
        setTestResult({
          success: false,
          error: errorMessage,
        });
        toast.error(
          t("cameraWizard.step1.testFailed", { error: errorMessage }),
        );
      })
      .finally(() => {
        setIsTesting(false);
      });
  }, [form, generateStreamUrl, onUpdate, t]);

  const onSubmit = (data: z.infer<typeof step1FormData>) => {
    onUpdate(data);
  };

  return (
    <div className="space-y-6">
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
                    placeholder={t("cameraWizard.step1.cameraNamePlaceholder")}
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
                    return selectedBrand ? (
                      <FormDescription className="pt-0.5">
                        <div className="mt-1 text-xs text-muted-foreground">
                          {selectedBrand.exampleUrl}
                        </div>
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
                    <FormLabel>{t("cameraWizard.step1.username")}</FormLabel>
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
                    <FormLabel>{t("cameraWizard.step1.password")}</FormLabel>
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
                            <LuEyeOff className="h-4 w-4" />
                          ) : (
                            <LuEye className="h-4 w-4" />
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

          {testResult && (
            <div className="mt-4">
              <div
                className={`text-sm font-medium ${testResult.success ? "text-success" : "text-danger"}`}
              >
                {testResult.success
                  ? t("cameraWizard.step1.testSuccess")
                  : t("cameraWizard.step1.testFailed")}
              </div>
              {testResult.success ? (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {testResult.resolution && (
                    <div>Resolution: {testResult.resolution}</div>
                  )}
                  {testResult.videoCodec && (
                    <div>Video: {testResult.videoCodec}</div>
                  )}
                  {testResult.audioCodec && (
                    <div>Audio: {testResult.audioCodec}</div>
                  )}
                  {testResult.fps && <div>FPS: {testResult.fps}</div>}
                </div>
              ) : (
                <div className="mt-2 text-xs text-danger">
                  {testResult.error}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-6 sm:flex-row sm:justify-end sm:gap-4">
            <Button type="button" onClick={onCancel} className="sm:flex-1">
              {t("button.cancel", { ns: "common" })}
            </Button>
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
          </div>
        </form>
      </Form>
    </div>
  );
}
