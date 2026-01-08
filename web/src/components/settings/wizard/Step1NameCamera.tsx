import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useState, useCallback, useMemo } from "react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  WizardFormData,
  CameraBrand,
  CAMERA_BRANDS,
  CAMERA_BRAND_VALUES,
} from "@/types/cameraWizard";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LuInfo } from "react-icons/lu";

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
  const [probeMode, setProbeMode] = useState<boolean>(
    wizardData.probeMode ?? true,
  );

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
        .refine(
          (value) => !existingCameraNames.includes(value),
          t("cameraWizard.step1.errors.nameExists"),
        ),
      host: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      brandTemplate: z.enum(CAMERA_BRAND_VALUES).optional(),
      onvifPort: z.coerce.number().int().min(1).max(65535).optional(),
      useDigestAuth: z.boolean().optional(),
      customUrl: z
        .string()
        .optional()
        .refine(
          (val) => !val || val.startsWith("rtsp://"),
          t("cameraWizard.step1.errors.customUrlRtspRequired"),
        ),
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
      onvifPort: wizardData.onvifPort ?? 80,
      useDigestAuth: wizardData.useDigestAuth ?? false,
    },
    mode: "onChange",
  });

  const watchedBrand = form.watch("brandTemplate");
  const watchedHost = form.watch("host");
  const watchedCustomUrl = form.watch("customUrl");

  const hostPresent = !!(watchedHost && watchedHost.trim());
  const customPresent = !!(watchedCustomUrl && watchedCustomUrl.trim());
  const cameraNamePresent = !!(form.getValues().cameraName || "").trim();

  const isContinueButtonEnabled =
    cameraNamePresent &&
    (probeMode
      ? hostPresent
      : watchedBrand === "other"
        ? customPresent
        : hostPresent);

  const onSubmit = (data: z.infer<typeof step1FormData>) => {
    onUpdate({ ...data, probeMode });
  };

  const handleContinue = useCallback(async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const data = form.getValues();
      onNext({ ...data, probeMode });
    }
  }, [form, probeMode, onNext]);

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
                <FormLabel className="text-primary-variant">
                  {t("cameraWizard.step1.cameraName")}
                </FormLabel>
                <FormControl>
                  <Input
                    className="text-md h-8"
                    placeholder={t("cameraWizard.step1.cameraNamePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <FormField
              control={form.control}
              name="host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary-variant">
                    {t("cameraWizard.step1.host")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="text-md h-8"
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
                  <FormLabel className="text-primary-variant">
                    {t("cameraWizard.step1.username")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="text-md h-8"
                      placeholder={t("cameraWizard.step1.usernamePlaceholder")}
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
                  <FormLabel className="text-primary-variant">
                    {t("cameraWizard.step1.password")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        className="text-md h-8 pr-10"
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
          </div>

          <div className="space-y-3 pt-4">
            <FormLabel className="text-primary-variant">
              {t("cameraWizard.step1.detectionMethod")}
            </FormLabel>
            <RadioGroup
              value={probeMode ? "probe" : "manual"}
              onValueChange={(value) => {
                setProbeMode(value === "probe");
              }}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="probe"
                  id="probe-mode"
                  className={
                    probeMode
                      ? "bg-selected from-selected/50 to-selected/90 text-selected"
                      : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                  }
                />
                <label htmlFor="probe-mode" className="cursor-pointer text-sm">
                  {t("cameraWizard.step1.probeMode")}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="manual"
                  id="manual-mode"
                  className={
                    !probeMode
                      ? "bg-selected from-selected/50 to-selected/90 text-selected"
                      : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                  }
                />
                <label htmlFor="manual-mode" className="cursor-pointer text-sm">
                  {t("cameraWizard.step1.manualMode")}
                </label>
              </div>
            </RadioGroup>
            <FormDescription>
              {t("cameraWizard.step1.detectionMethodDescription")}
            </FormDescription>
          </div>

          {probeMode && (
            <FormField
              control={form.control}
              name="onvifPort"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-primary-variant">
                    {t("cameraWizard.step1.onvifPort")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="text-md h-8"
                      type="text"
                      {...field}
                      placeholder="80"
                    />
                  </FormControl>
                  <FormDescription>
                    {t("cameraWizard.step1.onvifPortDescription")}
                  </FormDescription>
                  <FormMessage>
                    {fieldState.error ? fieldState.error.message : null}
                  </FormMessage>
                </FormItem>
              )}
            />
          )}

          {probeMode && (
            <FormField
              control={form.control}
              name="useDigestAuth"
              render={({ field }) => (
                <FormItem className="flex items-start space-x-2">
                  <FormControl>
                    <Checkbox
                      className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
                      checked={!!field.value}
                      onCheckedChange={(val) => field.onChange(!!val)}
                    />
                  </FormControl>
                  <div className="flex flex-1 flex-col space-y-1">
                    <FormLabel className="mb-0 text-primary-variant">
                      {t("cameraWizard.step1.useDigestAuth")}
                    </FormLabel>
                    <FormDescription className="mt-0">
                      {t("cameraWizard.step1.useDigestAuthDescription")}
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          )}

          {!probeMode && (
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="brandTemplate"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1 pb-1">
                      <FormLabel className="text-primary-variant">
                        {t("cameraWizard.step1.cameraBrand")}
                      </FormLabel>
                      {field.value &&
                        (() => {
                          const selectedBrand = CAMERA_BRANDS.find(
                            (brand) => brand.value === field.value,
                          );
                          return selectedBrand &&
                            selectedBrand.value != "other" ? (
                            <Popover modal={true}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0"
                                >
                                  <LuInfo className="size-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="pointer-events-auto w-80 text-primary-variant">
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
                          ) : null;
                        })()}
                    </div>
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
                            {brand.label.toLowerCase() === "other"
                              ? t("label.other", { ns: "common" })
                              : brand.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedBrand == "other" && (
                <FormField
                  control={form.control}
                  name="customUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary-variant">
                        {t("cameraWizard.step1.customUrl")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="text-md h-8"
                          placeholder="rtsp://username:password@host:port/path"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}
        </form>
      </Form>

      <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end sm:gap-4">
        <Button type="button" onClick={onCancel} className="sm:flex-1">
          {t("button.cancel", { ns: "common" })}
        </Button>
        <Button
          type="button"
          onClick={handleContinue}
          disabled={!isContinueButtonEnabled}
          variant="select"
          className="flex items-center justify-center gap-2 sm:flex-1"
        >
          {t("button.continue", { ns: "common" })}
        </Button>
      </div>
    </div>
  );
}
