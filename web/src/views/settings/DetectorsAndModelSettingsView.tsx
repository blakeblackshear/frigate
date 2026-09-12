import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LuExternalLink, LuFilter } from "react-icons/lu";
import { toast } from "sonner";
import axios from "axios";
import useSWR from "swr";
import { useSWRConfig } from "swr";
import { cn } from "@/lib/utils";
import { useRestart } from "@/api/ws";
import RestartDialog from "@/components/overlay/dialog/RestartDialog";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import Heading from "@/components/ui/heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { FrigateConfig } from "@/types/frigateConfig";
import type {
  SectionStatus,
  SettingsPageProps,
} from "@/views/settings/SingleSectionPage";
import type { ConfigSectionData } from "@/types/configForm";
import {
  SettingsGroupCard,
  SplitCardRow,
} from "@/components/card/SettingsGroupCard";
import { ConfigSectionTemplate } from "@/components/config-form/sections";
import { ConfigMessageBanner } from "@/components/config-form/ConfigMessageBanner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildHiddenFieldContext,
  getSectionConfig,
  resolveHiddenFieldEntries,
  sanitizeSectionData,
} from "@/utils/configUtil";

type ModelTab = "plus" | "custom";

type PageState = {
  detectors: ConfigSectionData;
  modelTab: ModelTab;
  plusModelId: string | undefined;
  customModel: ConfigSectionData;
};

type FrigatePlusModel = {
  id: string;
  type: string;
  name: string;
  isBaseModel: boolean;
  supportedDetectors: string[];
  trainDate: string;
  baseModel: string;
  width: number;
  height: number;
};

const TYPE_MODEL_DEFAULTS: Record<string, ConfigSectionData> = {
  cpu: {
    path: "/cpu_model.tflite",
    labelmap_path: "/labelmap.txt",
    width: 320,
    height: 320,
    input_tensor: "nhwc",
    input_pixel_format: "rgb",
    input_dtype: "int",
    model_type: "ssd",
  },
  edgetpu: {
    path: "/edgetpu_model.tflite",
    labelmap_path: "/labelmap.txt",
    width: 320,
    height: 320,
    input_tensor: "nhwc",
    input_pixel_format: "rgb",
    input_dtype: "int",
    model_type: "ssd",
  },
  openvino: {
    path: "/openvino-model/ssdlite_mobilenet_v2.xml",
    labelmap_path: "/openvino-model/coco_91cl_bkgr.txt",
    width: 300,
    height: 300,
    input_tensor: "nhwc",
    input_pixel_format: "bgr",
    input_dtype: "int",
    model_type: "ssd",
  },
};

const STATUS_BAR_KEY = "detectors_and_model";

const EMPTY_PENDING: Record<string, ConfigSectionData> = {};

const deriveInitialState = (config: FrigateConfig): PageState => {
  const plusModelId = config.model?.plus?.id;
  const modelPath = config.model?.path;
  const plusEnabled = Boolean(config.plus?.enabled);

  // The reliable signal that a Plus model is currently active is the
  // `model.plus.id` metadata
  let modelTab: ModelTab;
  if (plusModelId) {
    modelTab = "plus";
  } else if (typeof modelPath === "string" && modelPath.length > 0) {
    modelTab = "custom";
  } else if (plusEnabled) {
    modelTab = "plus";
  } else {
    modelTab = "custom";
  }
  // Fallback: if Plus is not enabled, prefer Custom regardless of saved state
  if (!plusEnabled && modelTab === "plus") {
    modelTab = "custom";
  }

  const { plus: _plus, ...modelWithoutPlus } = (config.model ?? {}) as Record<
    string,
    unknown
  >;
  // If a Plus model is active, the resolved `model.path` is auto-derived from
  // `plus.id` — drop it so the Custom tab starts clean and doesn't silently
  // re-save the same Plus model when the user thinks they switched modes.
  if (plusModelId) {
    delete modelWithoutPlus.path;
  }

  return {
    detectors: (config.detectors ?? {}) as ConfigSectionData,
    modelTab,
    plusModelId: plusModelId ?? undefined,
    customModel: modelWithoutPlus as ConfigSectionData,
  };
};

export default function DetectorsAndModelSettingsView({
  setUnsavedChanges,
  pendingDataBySection,
  onPendingDataChange,
  onSectionStatusChange,
  isSavingAll,
  onSectionSavingChange,
}: SettingsPageProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config } = useSWR<FrigateConfig>("config");
  const { mutate: globalMutate } = useSWRConfig();
  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  // track the saved config
  const snapshot = useMemo<PageState | null>(
    () => (config ? deriveInitialState(config) : null),
    [config],
  );
  const [state, setState] = useState<PageState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const { send: sendRestart } = useRestart();
  const childPending = pendingDataBySection ?? EMPTY_PENDING;
  const [detectorStatus, setDetectorStatus] = useState<SectionStatus>({
    hasChanges: false,
    isOverridden: false,
    hasValidationErrors: false,
  });
  const [modelStatus, setModelStatus] = useState<SectionStatus>({
    hasChanges: false,
    isOverridden: false,
    hasValidationErrors: false,
  });

  const [showBaseModels, setShowBaseModels] = useState(true);
  const [showFineTunedModels, setShowFineTunedModels] = useState(true);

  const plusEnabled = Boolean(config?.plus?.enabled);

  const { data: availableModels = {}, isLoading: isLoadingModels } = useSWR<
    Record<string, FrigatePlusModel>
  >(plusEnabled ? "/plus/models" : null, {
    fallbackData: {},
    fetcher: async (url) => {
      const res = await axios.get(url, { withCredentials: true });
      return res.data.reduce(
        (obj: Record<string, FrigatePlusModel>, model: FrigatePlusModel) => {
          obj[model.id] = model;
          return obj;
        },
        {},
      );
    },
  });

  const filteredModelEntries = useMemo(
    () =>
      Object.entries(availableModels || {}).filter(([, model]) =>
        model.isBaseModel ? showBaseModels : showFineTunedModels,
      ),
    [availableModels, showBaseModels, showFineTunedModels],
  );

  const isFilterActive = !showBaseModels || !showFineTunedModels;

  const detectorHiddenFields = useMemo(
    () =>
      resolveHiddenFieldEntries(
        getSectionConfig("detectors", "global").hiddenFields,
        buildHiddenFieldContext(config, "global"),
      ),
    [config],
  );
  const modelHiddenFields = useMemo(
    () =>
      resolveHiddenFieldEntries(
        getSectionConfig("model", "global").hiddenFields,
        buildHiddenFieldContext(config, "global"),
      ),
    [config],
  );

  const liveDetectors = useMemo(
    () => childPending["detectors"] ?? snapshot?.detectors,
    [childPending, snapshot],
  );
  const liveCustomModel = useMemo(
    () => childPending["model"] ?? snapshot?.customModel,
    [childPending, snapshot],
  );

  const currentDetectorType = useMemo(() => {
    const values = Object.values(liveDetectors ?? {});
    if (values.length === 0) return undefined;
    const first = values[0] as { type?: string } | undefined;
    return first?.type;
  }, [liveDetectors]);

  // fill in defaults when detector type changes
  const prevDetectorTypeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const newType = currentDetectorType;
    const prevType = prevDetectorTypeRef.current;
    prevDetectorTypeRef.current = newType;
    if (prevType === undefined || prevType === newType) return;
    if (!newType || !(newType in TYPE_MODEL_DEFAULTS)) return;

    const defaults = TYPE_MODEL_DEFAULTS[newType];
    onPendingDataChange?.("model", undefined, defaults);

    if (newType === "openvino") {
      const detectorsCurrent = (childPending.detectors ??
        state?.detectors ??
        {}) as {
        [key: string]: { device?: string };
      };
      const entries = Object.entries(detectorsCurrent);
      if (entries.length > 0) {
        const [firstKey, firstValue] = entries[0];
        if (!firstValue?.device) {
          onPendingDataChange?.("detectors", undefined, {
            ...detectorsCurrent,
            [firstKey]: { ...firstValue, device: "CPU" },
          } as ConfigSectionData);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDetectorType]);

  const isModelCompatible = useCallback(
    (model: FrigatePlusModel) =>
      currentDetectorType
        ? model.supportedDetectors.includes(currentDetectorType)
        : true,
    [currentDetectorType],
  );

  const selectedPlusModel = state?.plusModelId
    ? availableModels?.[state.plusModelId]
    : undefined;

  const plusMismatch =
    state?.modelTab === "plus" &&
    selectedPlusModel !== undefined &&
    currentDetectorType !== undefined &&
    !isModelCompatible(selectedPlusModel);

  const plusModelMissing = state?.modelTab === "plus" && !state?.plusModelId;

  const handleDetectorStatusChange = useCallback(
    (status: SectionStatus) => {
      setDetectorStatus(status);
      onSectionStatusChange?.("detectors", "global", status);
    },
    [onSectionStatusChange],
  );

  // BaseSection drives `modelStatus` only when the Custom tab is mounted
  const handleModelStatusChange = useCallback(
    (status: SectionStatus) => setModelStatus(status),
    [],
  );

  // report the *combined* model-section status to the parent
  useEffect(() => {
    if (!state || !snapshot) return;
    const tabChanged = state.modelTab !== snapshot.modelTab;
    const plusIdChanged =
      state.modelTab === "plus" && state.plusModelId !== snapshot.plusModelId;
    const pageLevelDirty = tabChanged || plusIdChanged;
    onSectionStatusChange?.("model", "global", {
      hasChanges: modelStatus.hasChanges || pageLevelDirty,
      isOverridden: modelStatus.isOverridden,
      overrideSource: modelStatus.overrideSource,
      hasValidationErrors: modelStatus.hasValidationErrors,
    });
  }, [state, snapshot, modelStatus, onSectionStatusChange]);

  // Tab toggle and Plus-model selection are page-local UI, but Save All and the
  // sidebar dot live on `pendingDataBySection["model"]` and section status from
  // the parent. These handlers mirror Plus-tab changes into both so a Plus-only
  // edit (no custom-form typing) is still dirty and survives navigation.
  const handleModelTabChange = useCallback(
    (newTab: ModelTab) => {
      setState((prev) => (prev ? { ...prev, modelTab: newTab } : prev));
      if (!snapshot) return;

      if (newTab === "plus") {
        if (state?.plusModelId) {
          onPendingDataChange?.("model", undefined, {
            path: `plus://${state.plusModelId}`,
          } as ConfigSectionData);
        } else {
          // No Plus model selected — clear any stale pending so the save
          // action is correctly disabled until the user picks one.
          onPendingDataChange?.("model", undefined, null);
        }
      } else {
        // Switching to Custom: if pending["model"] still holds a plus path
        // from a previous Plus selection, swap it for the snapshot's custom
        // model so Save All writes the correct payload. Don't overwrite
        // genuine custom-form edits the user typed earlier.
        const currentPath = (
          pendingDataBySection?.["model"] as { path?: string } | undefined
        )?.path;
        if (
          typeof currentPath === "string" &&
          currentPath.startsWith("plus://")
        ) {
          onPendingDataChange?.(
            "model",
            undefined,
            snapshot.customModel as ConfigSectionData,
          );
        }
      }
    },
    [state?.plusModelId, snapshot, pendingDataBySection, onPendingDataChange],
  );

  const handlePlusModelIdChange = useCallback(
    (newId: string) => {
      setState((prev) => (prev ? { ...prev, plusModelId: newId } : prev));
      onPendingDataChange?.("model", undefined, {
        path: `plus://${newId}`,
      } as ConfigSectionData);
    },
    [onPendingDataChange],
  );

  useEffect(() => {
    if (!config || state !== null) return;
    const initial = deriveInitialState(config);

    // Restore Plus-tab UI state from any prior pending edits the user made
    // before navigating away. `pendingDataBySection["model"]` is the source of
    // truth for Save All; infer modelTab/plusModelId from it so the UI lines up.
    const pendingModel = pendingDataBySection?.["model"] as
      | { path?: string }
      | undefined;
    const pendingPath = pendingModel?.path;
    if (typeof pendingPath === "string" && pendingPath.startsWith("plus://")) {
      setState({
        ...initial,
        modelTab: "plus",
        plusModelId: pendingPath.slice("plus://".length) || undefined,
      });
    } else if (pendingModel && initial.modelTab === "plus") {
      // There's a pending custom-model edit while the saved tab was Plus —
      // means the user already switched to Custom before navigating away.
      setState({ ...initial, modelTab: "custom" });
    } else {
      setState(initial);
    }
  }, [config, state, pendingDataBySection]);

  const isDirty = useMemo(() => {
    if (!state || !snapshot) return false;
    if (state.modelTab !== snapshot.modelTab) return true;
    if (state.plusModelId !== snapshot.plusModelId) return true;
    if ("detectors" in childPending) return true;
    if ("model" in childPending) return true;
    return false;
  }, [state, snapshot, childPending]);

  useEffect(() => {
    if (isDirty) {
      addMessage(
        STATUS_BAR_KEY,
        t("detectorsAndModel.unsavedChanges"),
        undefined,
        STATUS_BAR_KEY,
      );
    } else {
      removeMessage(STATUS_BAR_KEY, STATUS_BAR_KEY);
    }
    setUnsavedChanges?.(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  useEffect(() => {
    document.title = t("documentTitle.detectorsAndModel");
  }, [t]);

  const onSave = useCallback(async () => {
    if (!state || !snapshot) return;

    const tabChanged = state.modelTab !== snapshot.modelTab;

    // Strip computed/merged fields that the backend populates in /config
    // responses but doesn't accept back on /config/set.
    const sanitizedDetectors = sanitizeSectionData(
      liveDetectors ?? {},
      detectorHiddenFields,
    );
    const sanitizedCustomModel = sanitizeSectionData(
      liveCustomModel ?? {},
      modelHiddenFields,
    );

    const modelPayload =
      state.modelTab === "plus"
        ? { path: `plus://${state.plusModelId}` }
        : sanitizedCustomModel;

    const detectorKeysChanged =
      JSON.stringify(Object.keys(liveDetectors ?? {}).sort()) !==
      JSON.stringify(Object.keys(snapshot.detectors).sort());

    setIsSaving(true);
    onSectionSavingChange?.(true);
    let preCleared = false;
    try {
      // Pre-clear both `detectors` and `model` together when renaming
      if (tabChanged || detectorKeysChanged) {
        try {
          await axios.put("config/set", {
            requires_restart: 0,
            config_data: { detectors: null, model: null },
          });
          preCleared = true;
        } catch {
          // best-effort cleanup
        }
      }

      await axios.put("config/set", {
        requires_restart: 0,
        config_data: {
          detectors: sanitizedDetectors,
          model: modelPayload,
        },
      });

      await globalMutate("config");
      await globalMutate("config/raw_paths");

      // `snapshot` is derived from `config` via useMemo, so the awaited mutate
      // above has already refreshed it. Just clear the pending entries — that
      // resets isDirty since state should now match snapshot.
      onPendingDataChange?.("detectors", undefined, null);
      onPendingDataChange?.("model", undefined, null);
      setResetKey((k) => k + 1);

      addMessage(
        "detectors_and_model_restart",
        t("detectorsAndModel.restartRequired"),
        undefined,
        "detectors_and_model_restart",
      );

      toast.success(t("detectorsAndModel.toast.saveSuccess"), {
        position: "top-center",
        duration: 10000,
        action: (
          <Button onClick={() => setRestartDialogOpen(true)}>
            {t("restart.button", { ns: "components/dialog" })}
          </Button>
        ),
      });
    } catch (error) {
      const err = error as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        t("detectorsAndModel.toast.saveError");
      toast.error(message, { position: "top-center" });

      if (preCleared) {
        const restoreModel =
          snapshot.modelTab === "plus" && snapshot.plusModelId
            ? { path: `plus://${snapshot.plusModelId}` }
            : sanitizeSectionData(snapshot.customModel, modelHiddenFields);
        try {
          await axios.put("config/set", {
            requires_restart: 0,
            config_data: {
              detectors: sanitizeSectionData(
                snapshot.detectors,
                detectorHiddenFields,
              ),
              model: restoreModel,
            },
          });
        } catch {
          // best-effort
        }
      }

      // Re-sync the config cache to reflect whatever state the backend
      // landed on after the failure (and any restore attempt).
      await globalMutate("config");
    } finally {
      setIsSaving(false);
      onSectionSavingChange?.(false);
    }
  }, [
    state,
    snapshot,
    liveDetectors,
    liveCustomModel,
    detectorHiddenFields,
    modelHiddenFields,
    globalMutate,
    onSectionSavingChange,
    addMessage,
    onPendingDataChange,
    t,
  ]);

  const onUndo = useCallback(() => {
    if (snapshot) {
      setState(snapshot);
      onPendingDataChange?.("detectors", undefined, null);
      onPendingDataChange?.("model", undefined, null);
      // Force the embedded forms to re-mount so their internal dirty/baseline
      // state is rebuilt from the current config — clearing pending alone
      // doesn't reset BaseSection's internal tracking.
      setResetKey((k) => k + 1);
    }
  }, [snapshot, onPendingDataChange]);

  if (!config || !state) {
    return <ActivityIndicator />;
  }

  const saveDisabled =
    !isDirty ||
    isSaving ||
    isSavingAll ||
    detectorStatus.hasValidationErrors ||
    (state.modelTab === "custom" && modelStatus.hasValidationErrors) ||
    plusMismatch ||
    plusModelMissing;

  return (
    <div className="flex size-full flex-col md:pr-2">
      <div className="mb-1 flex items-center justify-between gap-4 pt-2">
        <div className="flex max-w-5xl flex-col">
          <Heading as="h4">{t("detectorsAndModel.title")}</Heading>
          <div className="my-1 text-sm text-muted-foreground">
            {t("detectorsAndModel.description")}
          </div>
          <div className="flex items-center text-sm text-primary-variant">
            <Link
              to={getLocaleDocUrl("/configuration/object_detectors")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline"
            >
              {t("readTheDocumentation", { ns: "common" })}
              <LuExternalLink className="ml-2 inline-flex size-3" />
            </Link>
          </div>
        </div>
        {isDirty && (
          <Badge
            variant="secondary"
            className="cursor-default bg-unsaved text-xs text-black hover:bg-unsaved"
          >
            {t("button.modified", { ns: "common", defaultValue: "Modified" })}
          </Badge>
        )}
      </div>
      <div className="w-full max-w-5xl space-y-6 pt-4">
        <div className="space-y-6">
          <SettingsGroupCard title={t("detectorsAndModel.cardTitles.detector")}>
            <ConfigSectionTemplate
              key={`detectors-${resetKey}`}
              sectionKey="detectors"
              level="global"
              showOverrideIndicator={false}
              showTitle={false}
              embedded
              pendingDataBySection={childPending}
              onPendingDataChange={onPendingDataChange}
              onStatusChange={handleDetectorStatusChange}
            />
          </SettingsGroupCard>
          {plusMismatch && selectedPlusModel && (
            <ConfigMessageBanner
              messages={[
                {
                  key: "plus-mismatch",
                  messageKey: "detectorsAndModel.mismatch.warning",
                  severity: "warning",
                  condition: () => true,
                  values: {
                    model: selectedPlusModel.name,
                    required: selectedPlusModel.supportedDetectors.join(", "),
                  },
                },
              ]}
            />
          )}
          <SettingsGroupCard title={t("detectorsAndModel.cardTitles.model")}>
            {plusEnabled ? (
              <Tabs
                value={state.modelTab}
                onValueChange={(value) =>
                  handleModelTabChange(value as ModelTab)
                }
              >
                <TabsList className="mb-4">
                  <TabsTrigger value="plus">
                    {t("detectorsAndModel.tabs.plus")}
                  </TabsTrigger>
                  <TabsTrigger value="custom">
                    {t("detectorsAndModel.tabs.custom")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="plus">
                  <SplitCardRow
                    label={t("frigatePlus.modelInfo.availableModels")}
                    description={
                      <Trans ns="views/settings">
                        frigatePlus.modelInfo.modelSelect
                      </Trans>
                    }
                    content={
                      <div className="flex w-full items-center gap-2">
                        <Select
                          value={state.plusModelId}
                          onValueChange={handlePlusModelIdChange}
                        >
                          <SelectTrigger className="w-full">
                            {state.plusModelId &&
                            availableModels?.[state.plusModelId]
                              ? new Date(
                                  availableModels[state.plusModelId].trainDate,
                                ).toLocaleString() +
                                " " +
                                availableModels[state.plusModelId].baseModel +
                                " (" +
                                (availableModels[state.plusModelId].isBaseModel
                                  ? t(
                                      "frigatePlus.modelInfo.plusModelType.baseModel",
                                    )
                                  : t(
                                      "frigatePlus.modelInfo.plusModelType.userModel",
                                    )) +
                                ") " +
                                availableModels[state.plusModelId].name +
                                " (" +
                                availableModels[state.plusModelId].width +
                                "x" +
                                availableModels[state.plusModelId].height +
                                ")"
                              : isLoadingModels
                                ? t(
                                    "frigatePlus.modelInfo.loadingAvailableModels",
                                  )
                                : t(
                                    "detectorsAndModel.plusModel.noModelSelected",
                                  )}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {filteredModelEntries.length === 0 ? (
                                <div className="px-4 py-3 text-center text-sm text-muted-foreground">
                                  {t("frigatePlus.modelInfo.noModelsAvailable")}
                                </div>
                              ) : (
                                filteredModelEntries.map(([id, model]) => (
                                  <SelectItem
                                    key={id}
                                    className="cursor-pointer"
                                    value={id}
                                    disabled={!isModelCompatible(model)}
                                  >
                                    {new Date(model.trainDate).toLocaleString()}{" "}
                                    <div>
                                      {model.baseModel} {" ("}
                                      {model.isBaseModel
                                        ? t(
                                            "frigatePlus.modelInfo.plusModelType.baseModel",
                                          )
                                        : t(
                                            "frigatePlus.modelInfo.plusModelType.userModel",
                                          )}
                                      {")"}
                                    </div>
                                    <div>
                                      {model.name} (
                                      {model.width + "x" + model.height})
                                    </div>
                                    <div>
                                      {t(
                                        "frigatePlus.modelInfo.supportedDetectors",
                                      )}
                                      : {model.supportedDetectors.join(", ")}
                                    </div>
                                    {!isModelCompatible(model) && (
                                      <div className="text-xs text-danger">
                                        {t(
                                          "detectorsAndModel.plusModel.requiresDetector",
                                          {
                                            detector:
                                              model.supportedDetectors.join(
                                                ", ",
                                              ),
                                          },
                                        )}
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                      {id}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="focus:outline-none"
                              aria-label={t(
                                "frigatePlus.modelInfo.filter.ariaLabel",
                              )}
                            >
                              <LuFilter
                                className={cn(
                                  "size-4",
                                  isFilterActive
                                    ? "text-selected"
                                    : "text-secondary-foreground",
                                )}
                              />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-56">
                            <div className="space-y-3">
                              <div className="text-sm text-primary-variant">
                                {t("frigatePlus.modelInfo.filter.ariaLabel")}
                              </div>
                              <div className="flex items-center justify-between">
                                <Label
                                  htmlFor="filterBaseModels"
                                  className="cursor-pointer text-primary"
                                >
                                  {t("frigatePlus.modelInfo.filter.baseModels")}
                                </Label>
                                <Switch
                                  id="filterBaseModels"
                                  checked={showBaseModels}
                                  onCheckedChange={setShowBaseModels}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label
                                  htmlFor="filterFineTunedModels"
                                  className="cursor-pointer text-primary"
                                >
                                  {t(
                                    "frigatePlus.modelInfo.filter.fineTunedModels",
                                  )}
                                </Label>
                                <Switch
                                  id="filterFineTunedModels"
                                  checked={showFineTunedModels}
                                  onCheckedChange={setShowFineTunedModels}
                                />
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    }
                  />
                </TabsContent>

                <TabsContent value="custom">
                  <ConfigSectionTemplate
                    key={`model-${resetKey}`}
                    sectionKey="model"
                    level="global"
                    showOverrideIndicator={false}
                    showTitle={false}
                    embedded
                    pendingDataBySection={childPending}
                    onPendingDataChange={onPendingDataChange}
                    onStatusChange={handleModelStatusChange}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <ConfigSectionTemplate
                key={`model-${resetKey}`}
                sectionKey="model"
                level="global"
                showOverrideIndicator={false}
                showTitle={false}
                embedded
                pendingDataBySection={childPending}
                onPendingDataChange={onPendingDataChange}
                onStatusChange={handleModelStatusChange}
              />
            )}
          </SettingsGroupCard>
        </div>
      </div>

      <div className="sticky bottom-0 z-50 mt-6 w-full border-t border-secondary bg-background pt-0">
        <div
          className={cn(
            "flex flex-col items-center gap-4 pt-2 md:flex-row",
            isDirty ? "justify-between" : "justify-end",
          )}
        >
          {isDirty && (
            <span className="text-sm text-unsaved">
              {t("unsavedChanges", { ns: "views/settings" })}
            </span>
          )}
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            {isDirty && (
              <Button
                onClick={onUndo}
                variant="outline"
                disabled={isSaving}
                className="flex min-w-36 flex-1 gap-2"
              >
                {t("button.undo", { ns: "common" })}
              </Button>
            )}
            <Button
              onClick={onSave}
              variant="select"
              disabled={saveDisabled}
              className="flex min-w-36 flex-1 gap-2"
            >
              {isSaving ? (
                <>
                  <ActivityIndicator className="h-4 w-4" />
                  {t("button.saving", { ns: "common" })}
                </>
              ) : (
                t("button.save", { ns: "common" })
              )}
            </Button>
          </div>
        </div>
      </div>
      <RestartDialog
        isOpen={restartDialogOpen}
        onClose={() => setRestartDialogOpen(false)}
        onRestart={() => sendRestart("restart")}
      />
    </div>
  );
}
