import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LuArrowRight, LuChevronDown, LuTriangleAlert } from "react-icons/lu";
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
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import RestartDialog from "@/components/overlay/dialog/RestartDialog";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import SaveAllPreviewPopover from "@/components/overlay/detail/SaveAllPreviewPopover";
import FilterSwitch from "@/components/filter/FilterSwitch";

type CloneCameraDialogProps = {
  open: boolean;
  onClose: () => void;
};

type CloneFormValues = {
  sourceCamera: string;
  targetMode: "new" | "existing";
  newName: string;
  existingTargets: string[];
};

export default function CloneCameraDialog({
  open,
  onClose,
}: CloneCameraDialogProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const { data: rawPaths } = useSWR<RawCameraPaths>("config/raw_paths");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sourceCameras = useMemo(() => {
    if (!config) return [];
    return Object.keys(config.cameras)
      .filter((c) => !isReplayCamera(c))
      .sort();
  }, [config]);

  const formSchema = useMemo(() => {
    const reservedNames = new Set<string>([
      ...(config ? Object.keys(config.cameras) : []),
      ...(config?.go2rtc?.streams ? Object.keys(config.go2rtc.streams) : []),
    ]);
    return z
      .object({
        sourceCamera: z.string(),
        targetMode: z.enum(["new", "existing"]),
        newName: z.string(),
        existingTargets: z.array(z.string()),
      })
      .superRefine((data, ctx) => {
        if (!data.sourceCamera) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["sourceCamera"],
            message: t("cameraManagement.clone.source.required"),
          });
        }
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
        } else if (data.existingTargets.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["existingTargets"],
            message: t("cameraManagement.clone.target.existingPlaceholder"),
          });
        }
      });
  }, [config, t]);

  const form = useForm<CloneFormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      sourceCamera: "",
      targetMode: "new",
      newName: "",
      existingTargets: [],
    },
  });

  const sourceCamera = form.watch("sourceCamera");
  const targetMode = form.watch("targetMode");
  const existingTargets = form.watch("existingTargets");

  const targetIsNew = targetMode === "new";

  const otherCameras = useMemo(() => {
    if (!config) return [];
    return Object.keys(config.cameras)
      .filter((c) => c !== sourceCamera && !isReplayCamera(c))
      .sort();
  }, [config, sourceCamera]);

  const srcCfg = config?.cameras?.[sourceCamera];

  // Existing targets whose detect resolution differs from the source. Spatial
  // settings use detect-resolution coordinates, so cloning them to a camera
  // with a different resolution is flagged (but still allowed).
  const mismatchedTargets = useMemo(() => {
    if (targetIsNew || !srcCfg?.detect) return [];
    return existingTargets.filter((cam) => {
      const dst = config?.cameras?.[cam];
      return dst?.detect && !resolutionsMatch(srcCfg.detect, dst.detect);
    });
  }, [targetIsNew, srcCfg, existingTargets, config]);

  const allResMatch = mismatchedTargets.length === 0;

  const [selectedCategories, setSelectedCategories] = useState<
    Set<CloneCategoryKey>
  >(() => getCategoryDefaults(true));

  // Reset form + selection only on the open transition
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      form.reset({
        sourceCamera: "",
        targetMode: "new",
        newName: "",
        existingTargets: [],
      });
      setSelectedCategories(getCategoryDefaults(true));
    } else if (!open) {
      wasOpenRef.current = false;
    }
  }, [open, form]);

  // Drop the source camera from the target selection if it gets picked.
  useEffect(() => {
    if (!sourceCamera) return;
    const current = form.getValues("existingTargets");
    if (current.includes(sourceCamera)) {
      form.setValue(
        "existingTargets",
        current.filter((c) => c !== sourceCamera),
      );
    }
  }, [sourceCamera, form]);

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
      const includeSpatial = targetIsNew || allResMatch;
      for (const cat of CLONE_CATEGORIES) {
        if (cat.newCameraOnly && !targetIsNew) continue;
        if (cat.group === "spatial" && !includeSpatial) continue;
        if (cat.group === "streams") continue;
        next.add(cat.key);
      }
      return next;
    });
  }, [targetIsNew, allResMatch]);

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
  const statusBar = useContext(StatusBarMessagesContext);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);

  const watchedNewName =
    useWatch({ control: form.control, name: "newName" }) ?? "";

  // Payloads grouped per destination camera. New mode has a single target;
  // existing mode fans out across every selected camera.
  const targetPayloads = useMemo<
    { target: string; payloads: ReturnType<typeof buildClonedCameraPayloads> }[]
  >(() => {
    if (!config || !fullSchema || !srcCfg) {
      return [];
    }
    if (targetIsNew) {
      const finalName = processCameraName(watchedNewName || "").finalCameraName;
      if (!watchedNewName || !finalName) return [];
      return [
        {
          target: finalName,
          payloads: buildClonedCameraPayloads({
            sourceCfg: srcCfg,
            sourceName: sourceCamera,
            targetInput: watchedNewName,
            targetIsNew: true,
            selectedKeys: selectedCategories,
            fullConfig: config,
            fullSchema,
            rawPaths,
          }),
        },
      ];
    }
    return existingTargets
      .filter((cam) => config.cameras?.[cam])
      .map((cam) => ({
        target: cam,
        payloads: buildClonedCameraPayloads({
          sourceCfg: srcCfg,
          sourceName: sourceCamera,
          targetInput: cam,
          targetIsNew: false,
          selectedKeys: selectedCategories,
          fullConfig: config,
          fullSchema,
          rawPaths,
        }),
      }));
  }, [
    config,
    fullSchema,
    srcCfg,
    sourceCamera,
    targetIsNew,
    existingTargets,
    watchedNewName,
    selectedCategories,
    rawPaths,
  ]);

  const previewPayloads = useMemo(
    () => targetPayloads.flatMap((tp) => tp.payloads),
    [targetPayloads],
  );

  const previewItems = useMemo(
    () =>
      targetPayloads.flatMap((tp) =>
        buildClonePreviewItems(tp.payloads, tp.target),
      ),
    [targetPayloads],
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

      const friendlyName = (cam: string) =>
        config.cameras?.[cam]?.friendly_name ?? cam;

      const extractError = (error: unknown) =>
        (axios.isAxiosError(error) &&
          (error.response?.data?.message || error.response?.data?.detail)) ||
        (error instanceof Error ? error.message : "Unknown error");

      const restartAction = (
        <a onClick={() => setRestartDialogOpen(true)}>
          <Button>{t("restart.button", { ns: "components/dialog" })}</Button>
        </a>
      );

      const markRestartRequired = () =>
        statusBar?.addMessage(
          "config_restart_required",
          t("configForm.restartRequiredFooter"),
          undefined,
          "config_restart_required",
        );

      setIsSubmitting(true);

      if (targetIsNew) {
        const targetLabel = values.newName.trim();
        const payloads = targetPayloads[0]?.payloads ?? [];
        let appliedCount = 0;
        let failedSection: string | undefined;
        let failureMessage: string | undefined;

        try {
          for (const payload of payloads) {
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
              failureMessage = extractError(error);
              break;
            }
          }
        } finally {
          await swrMutate("config");
          setIsSubmitting(false);
        }

        if (failedSection) {
          toast.error(
            appliedCount > 0
              ? t("cameraManagement.clone.toast.newCameraPartialFailure", {
                  cameraName: targetLabel,
                  errorMessage: failureMessage,
                })
              : t("cameraManagement.clone.toast.partialFailure", {
                  successCount: appliedCount,
                  failedSection,
                  errorMessage: failureMessage,
                }),
            { position: "top-center" },
          );
          return;
        }

        if (anyNeedsRestart) {
          markRestartRequired();
          toast.success(
            t("cameraManagement.clone.toast.successWithRestart", {
              cameraName: targetLabel,
            }),
            { position: "top-center", duration: 10000, action: restartAction },
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
        return;
      }

      // One or more existing cameras: keep going if a camera fails, summarize.
      const succeeded: string[] = [];
      const failed: string[] = [];
      let lastError: string | undefined;

      try {
        for (const { target, payloads } of targetPayloads) {
          let cameraError: string | undefined;
          for (const payload of payloads) {
            try {
              await axios.put("config/set", {
                requires_restart: payload.needsRestart ? 1 : 0,
                update_topic: payload.updateTopic,
                config_data: buildConfigDataForPath(
                  payload.basePath,
                  payload.sanitizedOverrides,
                ),
              });
            } catch (error) {
              cameraError = extractError(error);
              break;
            }
          }
          if (cameraError) {
            failed.push(friendlyName(target));
            lastError = cameraError;
          } else {
            succeeded.push(friendlyName(target));
          }
        }
      } finally {
        await swrMutate("config");
        setIsSubmitting(false);
      }

      if (failed.length > 0) {
        toast.error(
          t("cameraManagement.clone.toast.partialFailureMulti", {
            successCount: succeeded.length,
            failed: failed.join(", "),
            errorMessage: lastError,
          }),
          { position: "top-center", duration: 10000 },
        );
        return;
      }

      const singleLabel = succeeded.length === 1 ? succeeded[0] : undefined;

      if (anyNeedsRestart) {
        markRestartRequired();
        toast.success(
          singleLabel
            ? t("cameraManagement.clone.toast.successWithRestart", {
                cameraName: singleLabel,
              })
            : t("cameraManagement.clone.toast.successMultiWithRestart", {
                count: succeeded.length,
              }),
          { position: "top-center", duration: 10000, action: restartAction },
        );
      } else {
        toast.success(
          singleLabel
            ? t("cameraManagement.clone.toast.success", {
                cameraName: singleLabel,
              })
            : t("cameraManagement.clone.toast.successMulti", {
                count: succeeded.length,
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
      targetPayloads,
      targetIsNew,
      anyNeedsRestart,
      onClose,
      statusBar,
      t,
    ],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={cn(
          "scrollbar-container max-h-[90dvh] max-w-4xl overflow-y-auto",
        )}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("cameraManagement.clone.title")}</DialogTitle>
          <DialogDescription>
            {t("cameraManagement.clone.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="relative flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-12">
              <div className="space-y-3">
                <Label className="text-base">
                  {t("cameraManagement.clone.source.label")}
                </Label>
                <FormField
                  control={form.control}
                  name="sourceCamera"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="w-full max-w-xs md:max-w-none">
                            <SelectValue
                              placeholder={t(
                                "cameraManagement.clone.source.placeholder",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {sourceCameras.map((cam) => (
                              <SelectItem key={cam} value={cam}>
                                {config?.cameras?.[cam]?.friendly_name ?? cam}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                              <FormItem>
                                <FormLabel className="sr-only">
                                  {t(
                                    "cameraManagement.clone.target.newNameLabel",
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...form.register("newName")}
                                    className="max-w-xs md:max-w-none"
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
                                {t(
                                  "cameraManagement.clone.target.existingCamerasRadio",
                                )}
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
                                  name="existingTargets"
                                  render={({ field: tgtField }) => {
                                    const selected = tgtField.value ?? [];
                                    const allSelected =
                                      otherCameras.length > 0 &&
                                      otherCameras.every((c) =>
                                        selected.includes(c),
                                      );
                                    const selectedNames = otherCameras
                                      .filter((c) => selected.includes(c))
                                      .map(
                                        (c) =>
                                          config?.cameras?.[c]?.friendly_name ??
                                          c,
                                      );
                                    const summary = allSelected
                                      ? t(
                                          "cameraManagement.clone.target.allCameras",
                                        )
                                      : selectedNames.length > 0
                                        ? selectedNames.join(", ")
                                        : t(
                                            "cameraManagement.clone.target.existingPlaceholder",
                                          );
                                    return (
                                      <FormItem>
                                        <Popover>
                                          <FormControl>
                                            <PopoverTrigger asChild>
                                              <Button
                                                type="button"
                                                variant="outline"
                                                disabled={isSubmitting}
                                                className="w-full max-w-xs justify-between font-normal md:max-w-none"
                                              >
                                                <span
                                                  className={cn(
                                                    "truncate",
                                                    selectedNames.length ===
                                                      0 &&
                                                      "text-muted-foreground",
                                                  )}
                                                >
                                                  {summary}
                                                </span>
                                                <LuChevronDown className="ml-2 size-4 shrink-0 opacity-50" />
                                              </Button>
                                            </PopoverTrigger>
                                          </FormControl>
                                          <PopoverContent
                                            align="start"
                                            disablePortal
                                            className="w-[--radix-popover-trigger-width] p-0"
                                          >
                                            <div className="scrollbar-container max-h-60 space-y-4 overflow-y-auto p-4">
                                              <FilterSwitch
                                                label={t(
                                                  "cameraManagement.clone.target.allCameras",
                                                )}
                                                isChecked={allSelected}
                                                disabled={isSubmitting}
                                                onCheckedChange={(checked) =>
                                                  tgtField.onChange(
                                                    checked
                                                      ? [...otherCameras]
                                                      : [],
                                                  )
                                                }
                                              />
                                              <div className="space-y-2.5">
                                                {otherCameras.map((cam) => (
                                                  <FilterSwitch
                                                    key={cam}
                                                    label={cam}
                                                    type="camera"
                                                    isChecked={selected.includes(
                                                      cam,
                                                    )}
                                                    disabled={isSubmitting}
                                                    onCheckedChange={(
                                                      checked,
                                                    ) =>
                                                      tgtField.onChange(
                                                        checked
                                                          ? [...selected, cam]
                                                          : selected.filter(
                                                              (c) => c !== cam,
                                                            ),
                                                      )
                                                    }
                                                  />
                                                ))}
                                              </div>
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                      </FormItem>
                                    );
                                  }}
                                />
                              )}
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="pointer-events-none absolute left-1/2 top-0 hidden -translate-x-1/2 flex-col space-y-3 md:flex">
                <Label className="invisible text-base" aria-hidden="true">
                  {" "}
                </Label>
                <div className="flex h-10 items-center justify-center">
                  <LuArrowRight className="size-6 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div className="space-y-1">
                  <Label className="text-base">
                    {t("cameraManagement.clone.categories.legend")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("cameraManagement.clone.categories.description")}
                  </p>
                </div>
                <div className="flex flex-row items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="cursor-pointer whitespace-nowrap"
                    onClick={isSubmitting ? undefined : selectAllCategories}
                  >
                    {t("cameraManagement.clone.categories.selectAll")}
                  </span>
                  <span aria-hidden="true">|</span>
                  <span
                    className="cursor-pointer whitespace-nowrap"
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
                <div className="grid grid-cols-1 gap-x-12 gap-y-3 rounded-lg bg-secondary p-4 sm:grid-cols-2">
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
                    srcCfg?.detect &&
                    mismatchedTargets.length > 0 && (
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
                              srcWidth: srcCfg.detect.width,
                              srcHeight: srcCfg.detect.height,
                              cameras: mismatchedTargets
                                .map(
                                  (c) =>
                                    config?.cameras?.[c]?.friendly_name ?? c,
                                )
                                .join(", "),
                            },
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  <div className="grid grid-cols-1 gap-x-12 gap-y-3 rounded-lg bg-secondary p-4 sm:grid-cols-2">
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
