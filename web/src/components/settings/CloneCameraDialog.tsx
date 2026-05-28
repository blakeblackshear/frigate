import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import useSWR, { mutate as swrMutate } from "swr";
import axios from "axios";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { isReplayCamera, processCameraName } from "@/utils/cameraUtil";
import type { FrigateConfig } from "@/types/frigateConfig";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { LuTriangleAlert } from "react-icons/lu";
import {
  CLONE_CATEGORIES,
  type CloneCategoryKey,
  type CloneCategoryGroup,
  type RawCameraPaths,
  getCategoryDefaults,
  resolutionsMatch,
  buildClonedCameraPayloads,
  buildClonePreviewItems,
} from "@/utils/cameraClone";
import { buildConfigDataForPath } from "@/utils/configUtil";
import { useConfigSchema } from "@/hooks/use-config-schema";
import { useRestart } from "@/api/ws";
import RestartDialog from "@/components/overlay/dialog/RestartDialog";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import SaveAllPreviewPopover from "@/components/overlay/detail/SaveAllPreviewPopover";

type CloneCameraDialogProps = {
  open: boolean;
  onClose: () => void;
  sourceCamera: string;
};

type CloneFormValues = {
  targetMode: "new" | "existing";
  newName: string;
  existingTarget: string;
};

export default function CloneCameraDialog({
  open,
  onClose,
  sourceCamera,
}: CloneCameraDialogProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: rawPaths } = useSWR<RawCameraPaths>("config/raw_paths");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otherCameras = useMemo(() => {
    if (!config) return [];
    return Object.keys(config.cameras)
      .filter((c) => c !== sourceCamera && !isReplayCamera(c))
      .sort();
  }, [config, sourceCamera]);

  const formSchema = useMemo(() => {
    const reservedNames = new Set<string>([
      ...(config ? Object.keys(config.cameras) : []),
      ...(config?.go2rtc?.streams ? Object.keys(config.go2rtc.streams) : []),
    ]);
    return z
      .object({
        targetMode: z.enum(["new", "existing"]),
        newName: z.string(),
        existingTarget: z.string(),
      })
      .superRefine((data, ctx) => {
        if (data.targetMode === "new") {
          const trimmed = data.newName.trim();
          if (!trimmed) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["newName"],
              message: t("cameraManagement.clone.target.newNameRequired"),
            });
            return;
          }
          const { finalCameraName } = processCameraName(trimmed);
          if (!finalCameraName) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["newName"],
              message: t("cameraManagement.clone.target.newNameInvalid"),
            });
            return;
          }
          if (reservedNames.has(finalCameraName)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["newName"],
              message: t("cameraManagement.clone.target.newNameCollision"),
            });
          }
        } else if (!data.existingTarget) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["existingTarget"],
            message: t("cameraManagement.clone.target.existingPlaceholder"),
          });
        }
      });
  }, [config, t]);

  const form = useForm<CloneFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetMode: "new",
      newName: "",
      existingTarget: "",
    },
  });

  const targetMode = form.watch("targetMode");
  const existingTarget = form.watch("existingTarget");

  const targetIsNew = targetMode === "new";

  const srcCfg = config?.cameras?.[sourceCamera];
  const dstCfg =
    !targetIsNew && existingTarget
      ? config?.cameras?.[existingTarget]
      : undefined;

  const resMatch = useMemo(
    () => resolutionsMatch(srcCfg?.detect, dstCfg?.detect),
    [srcCfg, dstCfg],
  );

  const [selectedCategories, setSelectedCategories] = useState<
    Set<CloneCategoryKey>
  >(() => getCategoryDefaults(true));

  // Reset form + selection only on the open transition
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      form.reset({
        targetMode: "new",
        newName: "",
        existingTarget: otherCameras[0] ?? "",
      });
      setSelectedCategories(getCategoryDefaults(true));
    } else if (!open) {
      wasOpenRef.current = false;
    }
  }, [open, form, otherCameras]);

  // Reset selection to per-mode defaults when the user switches target mode.
  useEffect(() => {
    setSelectedCategories(getCategoryDefaults(targetIsNew));
  }, [targetIsNew]);

  const toggleCategory = useCallback((key: CloneCategoryKey) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllCategories = useCallback(() => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      const includeSpatial = targetIsNew || resMatch;
      for (const cat of CLONE_CATEGORIES) {
        if (cat.newCameraOnly && !targetIsNew) continue;
        if (cat.group === "spatial" && !includeSpatial) continue;
        if (cat.group === "streams") continue;
        next.add(cat.key);
      }
      return next;
    });
  }, [targetIsNew, resMatch]);

  const selectNoneCategories = useCallback(() => {
    setSelectedCategories((prev) => {
      const next = new Set<CloneCategoryKey>();
      for (const cat of CLONE_CATEGORIES) {
        if (cat.group === "streams" && prev.has(cat.key)) {
          next.add(cat.key);
        }
      }
      return next;
    });
  }, []);

  const visibleCategories = useMemo(
    () => CLONE_CATEGORIES.filter((c) => targetIsNew || !c.newCameraOnly),
    [targetIsNew],
  );

  const groupedCategories = useMemo(() => {
    const groups: Record<CloneCategoryGroup, typeof visibleCategories> = {
      general: [],
      spatial: [],
      streams: [],
    };
    for (const c of visibleCategories) {
      groups[c.group].push(c);
    }
    return groups;
  }, [visibleCategories]);

  const sourceFriendlyName =
    config?.cameras?.[sourceCamera]?.friendly_name ?? sourceCamera;

  const fullSchema = useConfigSchema();
  const { send: sendRestart } = useRestart();
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

  const watchedNewName =
    useWatch({ control: form.control, name: "newName" }) ?? "";

  const previewPayloads = useMemo(() => {
    if (!config || !fullSchema || !srcCfg) return [];
    const targetInput = targetIsNew ? watchedNewName : existingTarget;
    if (!targetInput) return [];
    if (!targetIsNew && !config.cameras?.[targetInput]) return [];
    return buildClonedCameraPayloads({
      sourceCfg: srcCfg,
      sourceName: sourceCamera,
      targetInput,
      targetIsNew,
      selectedKeys: selectedCategories,
      fullConfig: config,
      fullSchema,
      rawPaths,
    });
  }, [
    config,
    fullSchema,
    srcCfg,
    sourceCamera,
    targetIsNew,
    existingTarget,
    watchedNewName,
    selectedCategories,
    rawPaths,
  ]);

  const previewTarget = targetIsNew
    ? processCameraName(watchedNewName || "").finalCameraName
    : existingTarget;

  const previewItems = useMemo(
    () =>
      previewTarget
        ? buildClonePreviewItems(previewPayloads, previewTarget)
        : [],
    [previewPayloads, previewTarget],
  );

  const anyNeedsRestart = previewPayloads.some((p) => p.needsRestart);
  const changeCount = previewItems.length;

  const onSubmit = useCallback(
    async (values: CloneFormValues) => {
      if (!config || !srcCfg || !fullSchema) return;
      if (previewPayloads.length === 0) {
        toast.error(
          t("cameraManagement.clone.toast.submitError", {
            errorMessage: t("cameraManagement.clone.footer.changeCount", {
              count: 0,
            }),
          }),
        );
        return;
      }

      const target = targetIsNew
        ? processCameraName(values.newName.trim()).finalCameraName
        : values.existingTarget;
      const targetLabel = targetIsNew
        ? values.newName.trim()
        : (config.cameras?.[target]?.friendly_name ?? target);

      setIsSubmitting(true);
      let appliedCount = 0;
      let failedSection: string | undefined;
      let failureMessage: string | undefined;

      try {
        for (const payload of previewPayloads) {
          try {
            await axios.put("config/set", {
              requires_restart: payload.needsRestart ? 1 : 0,
              update_topic: payload.updateTopic,
              config_data: buildConfigDataForPath(
                payload.basePath,
                payload.sanitizedOverrides,
              ),
            });
            appliedCount += 1;
          } catch (error) {
            failedSection = payload.basePath;
            failureMessage =
              (axios.isAxiosError(error) &&
                (error.response?.data?.message ||
                  error.response?.data?.detail)) ||
              (error instanceof Error ? error.message : "Unknown error");
            break;
          }
        }
      } finally {
        await swrMutate("config");
        setIsSubmitting(false);
      }

      if (failedSection) {
        if (targetIsNew && appliedCount > 0) {
          toast.error(
            t("cameraManagement.clone.toast.newCameraPartialFailure", {
              cameraName: targetLabel,
              errorMessage: failureMessage,
            }),
            { position: "top-center" },
          );
        } else {
          toast.error(
            t("cameraManagement.clone.toast.partialFailure", {
              successCount: appliedCount,
              failedSection,
              errorMessage: failureMessage,
            }),
            { position: "top-center" },
          );
        }
        return;
      }

      if (anyNeedsRestart) {
        toast.success(
          t("cameraManagement.clone.toast.successWithRestart", {
            cameraName: targetLabel,
          }),
          {
            position: "top-center",
            duration: 10000,
            action: (
              <a onClick={() => setRestartDialogOpen(true)}>
                <Button>
                  {t("restart.button", { ns: "components/dialog" })}
                </Button>
              </a>
            ),
          },
        );
      } else {
        toast.success(
          t("cameraManagement.clone.toast.success", {
            cameraName: targetLabel,
          }),
          { position: "top-center" },
        );
      }

      onClose();
    },
    [
      config,
      srcCfg,
      fullSchema,
      previewPayloads,
      targetIsNew,
      anyNeedsRestart,
      onClose,
      t,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "scrollbar-container max-h-[90dvh] max-w-3xl overflow-y-auto",
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {t("cameraManagement.clone.title", {
              cameraName: sourceFriendlyName,
            })}
          </DialogTitle>
          <DialogDescription>
            {t("cameraManagement.clone.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base">
                {t("cameraManagement.clone.target.legend")}
              </Label>
              <FormField
                control={form.control}
                name="targetMode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3 space-y-0">
                            <RadioGroupItem
                              value="new"
                              id="clone-target-new"
                              className={
                                targetMode === "new"
                                  ? "bg-selected from-selected/50 to-selected/90 text-selected"
                                  : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                              }
                            />
                            <Label
                              htmlFor="clone-target-new"
                              className="font-normal"
                            >
                              {t("cameraManagement.clone.target.newRadio")}
                            </Label>
                          </div>
                          {targetMode === "new" && (
                            <FormItem className="ml-7">
                              <FormLabel className="sr-only">
                                {t(
                                  "cameraManagement.clone.target.newNameLabel",
                                )}
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...form.register("newName")}
                                  placeholder={t(
                                    "cameraManagement.clone.target.newNamePlaceholder",
                                  )}
                                  disabled={isSubmitting}
                                  autoFocus
                                />
                              </FormControl>
                              {form.formState.errors.newName?.message && (
                                <p className="text-sm font-medium text-destructive">
                                  {String(
                                    form.formState.errors.newName.message,
                                  )}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  "cameraManagement.clone.target.newStreamsForced",
                                )}
                              </p>
                            </FormItem>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-3 space-y-0">
                            <RadioGroupItem
                              value="existing"
                              id="clone-target-existing"
                              disabled={otherCameras.length === 0}
                              className={
                                targetMode === "existing"
                                  ? "bg-selected from-selected/50 to-selected/90 text-selected"
                                  : "bg-secondary from-secondary/50 to-secondary/90 text-secondary"
                              }
                            />
                            <Label
                              htmlFor="clone-target-existing"
                              className={cn(
                                "font-normal",
                                otherCameras.length === 0 &&
                                  "text-muted-foreground",
                              )}
                            >
                              {t("cameraManagement.clone.target.existingRadio")}
                              {otherCameras.length === 0 && (
                                <span className="ml-2 text-xs">
                                  (
                                  {t(
                                    "cameraManagement.clone.target.existingDisabled",
                                  )}
                                  )
                                </span>
                              )}
                            </Label>
                          </div>
                          {targetMode === "existing" &&
                            otherCameras.length > 0 && (
                              <FormField
                                control={form.control}
                                name="existingTarget"
                                render={({ field: tgtField }) => (
                                  <FormItem className="ml-7">
                                    <FormControl>
                                      <Select
                                        value={tgtField.value}
                                        onValueChange={tgtField.onChange}
                                      >
                                        <SelectTrigger className="w-full max-w-xs">
                                          <SelectValue
                                            placeholder={t(
                                              "cameraManagement.clone.target.existingPlaceholder",
                                            )}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {otherCameras.map((cam) => (
                                            <SelectItem key={cam} value={cam}>
                                              {config?.cameras?.[cam]
                                                ?.friendly_name ?? cam}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex flex-row items-center justify-between gap-2">
                <Label className="text-base">
                  {t("cameraManagement.clone.categories.legend")}
                </Label>
                <div className="flex flex-row items-center gap-2 text-right text-xs text-muted-foreground">
                  <span
                    className="cursor-pointer"
                    onClick={isSubmitting ? undefined : selectAllCategories}
                  >
                    {t("cameraManagement.clone.categories.selectAll")}
                  </span>
                  <span aria-hidden="true">|</span>
                  <span
                    className="cursor-pointer"
                    onClick={isSubmitting ? undefined : selectNoneCategories}
                  >
                    {t("cameraManagement.clone.categories.selectNone")}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">
                  {t("cameraManagement.clone.categories.general")}
                </Label>
                <div className="grid grid-cols-1 gap-3 rounded-lg bg-secondary p-4 sm:grid-cols-2">
                  {groupedCategories.general.map((cat) => (
                    <label
                      key={cat.key}
                      className="flex flex-row items-center space-x-3 space-y-0 text-sm font-normal"
                    >
                      <Checkbox
                        className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
                        checked={selectedCategories.has(cat.key)}
                        onCheckedChange={() => toggleCategory(cat.key)}
                        disabled={isSubmitting}
                      />
                      <span>
                        {t(
                          `cameraManagement.clone.categories.items.${cat.key}`,
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {groupedCategories.spatial.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-medium">
                    {t("cameraManagement.clone.categories.spatial")}
                  </Label>
                  {!targetIsNew &&
                    !resMatch &&
                    srcCfg?.detect &&
                    dstCfg?.detect && (
                      <Alert variant="warning">
                        <LuTriangleAlert className="size-5" />
                        <AlertTitle>
                          {t(
                            "cameraManagement.clone.categories.spatialWarningTitle",
                          )}
                        </AlertTitle>
                        <AlertDescription>
                          {t(
                            "cameraManagement.clone.categories.spatialWarning",
                            {
                              srcCamera: sourceFriendlyName,
                              dstCamera:
                                config?.cameras?.[existingTarget]
                                  ?.friendly_name ?? existingTarget,
                              srcWidth: srcCfg.detect.width,
                              srcHeight: srcCfg.detect.height,
                              dstWidth: dstCfg.detect.width,
                              dstHeight: dstCfg.detect.height,
                            },
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  <div className="grid grid-cols-1 gap-3 rounded-lg bg-secondary p-4 sm:grid-cols-2">
                    {groupedCategories.spatial.map((cat) => (
                      <label
                        key={cat.key}
                        className="flex flex-row items-center space-x-3 space-y-0 text-sm font-normal"
                      >
                        <Checkbox
                          className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
                          checked={selectedCategories.has(cat.key)}
                          onCheckedChange={() => toggleCategory(cat.key)}
                          disabled={isSubmitting}
                        />
                        <span>
                          {t(
                            `cameraManagement.clone.categories.items.${cat.key}`,
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {targetIsNew && groupedCategories.streams.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-medium">
                    {t("cameraManagement.clone.categories.streams")}
                  </Label>
                  <div className="grid grid-cols-1 gap-3 rounded-lg bg-secondary p-4">
                    {groupedCategories.streams.map((cat) => (
                      <label
                        key={cat.key}
                        className="flex flex-row items-center space-x-3 space-y-0 text-sm font-normal text-muted-foreground"
                      >
                        <Checkbox
                          className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
                          checked
                          disabled
                        />
                        <span>
                          {t(
                            `cameraManagement.clone.categories.items.${cat.key}`,
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                {changeCount > 0 && (
                  <>
                    <div className="flex items-center gap-1">
                      <span>
                        {t("cameraManagement.clone.footer.changeCount", {
                          count: changeCount,
                        })}
                      </span>
                      {changeCount > 0 && (
                        <SaveAllPreviewPopover
                          items={previewItems}
                          className="h-7 w-7"
                          align="start"
                          side="top"
                          disablePortal
                        />
                      )}
                    </div>
                    <span className="text-xs">
                      {anyNeedsRestart
                        ? t("cameraManagement.clone.footer.restartNeeded")
                        : t("cameraManagement.clone.footer.liveOnly")}
                    </span>
                  </>
                )}
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  className="w-full sm:w-auto"
                >
                  {t("button.cancel", { ns: "common" })}
                </Button>
                <Button
                  variant="select"
                  type="submit"
                  disabled={isSubmitting || changeCount === 0}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <ActivityIndicator className="size-4" />
                      <span>
                        {t("cameraManagement.clone.footer.submitting")}
                      </span>
                    </div>
                  ) : (
                    t("cameraManagement.clone.footer.submit")
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
        <RestartDialog
          isOpen={restartDialogOpen}
          onClose={() => setRestartDialogOpen(false)}
          onRestart={() => sendRestart("restart")}
        />
      </DialogContent>
    </Dialog>
  );
}
