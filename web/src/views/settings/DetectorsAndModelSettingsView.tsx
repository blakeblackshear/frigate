import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LuExternalLink, LuFilter } from "react-icons/lu";
import { toast } from "sonner";
import isEqual from "lodash/isEqual";
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
import { Toaster } from "@/components/ui/sonner";
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
import { SettingsGroupCard } from "@/components/card/SettingsGroupCard";
import { ConfigSectionTemplate } from "@/components/config-form/sections";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const STATUS_BAR_KEY = "detectors_and_model";

const deriveInitialState = (config: FrigateConfig): PageState => {
  const modelPath = config.model?.path;
  const plusEnabled = Boolean(config.plus?.enabled);
  let modelTab: ModelTab;
  if (typeof modelPath === "string" && modelPath.startsWith("plus://")) {
    modelTab = "plus";
  } else if (typeof modelPath === "string" && modelPath.length > 0) {
    modelTab = "custom";
  } else if (plusEnabled) {
    modelTab = "plus";
  } else {
    modelTab = "custom";
  }
  // Fallback: if Plus is not enabled, prefer Custom regardless of saved path
  if (!plusEnabled && modelTab === "plus") {
    modelTab = "custom";
  }

  const plusModelId = config.model?.plus?.id;
  const { plus: _plus, ...modelWithoutPlus } = (config.model ?? {}) as Record<
    string,
    unknown
  >;

  return {
    detectors: (config.detectors ?? {}) as ConfigSectionData,
    modelTab,
    plusModelId: plusModelId ?? undefined,
    customModel: modelWithoutPlus as ConfigSectionData,
  };
};

export default function DetectorsAndModelSettingsView(
  _props: SettingsPageProps,
) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config } = useSWR<FrigateConfig>("config");
  const { mutate: globalMutate } = useSWRConfig();
  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  const [snapshot, setSnapshot] = useState<PageState | null>(null);
  const [state, setState] = useState<PageState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const { send: sendRestart } = useRestart();
  const [childPending, setChildPending] = useState<
    Record<string, ConfigSectionData>
  >({});
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

  const currentDetectorType = useMemo(() => {
    if (!state) return undefined;
    const values = Object.values(state.detectors ?? {});
    if (values.length === 0) return undefined;
    const first = values[0] as { type?: string } | undefined;
    return first?.type;
  }, [state]);

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

  const handleChildPendingChange = useCallback(
    (
      sectionKey: string,
      _cameraName: string | undefined,
      data: ConfigSectionData | null,
    ) => {
      setChildPending((prev) => {
        if (data === null) {
          if (!(sectionKey in prev)) return prev;
          const { [sectionKey]: _drop, ...rest } = prev;
          return rest;
        }
        return { ...prev, [sectionKey]: data };
      });
    },
    [],
  );

  const handleDetectorStatusChange = useCallback(
    (status: SectionStatus) => setDetectorStatus(status),
    [],
  );

  const handleModelStatusChange = useCallback(
    (status: SectionStatus) => setModelStatus(status),
    [],
  );

  useEffect(() => {
    const detectorsPending = childPending["detectors"];
    if (detectorsPending) {
      setState((prev) =>
        prev ? { ...prev, detectors: detectorsPending } : prev,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childPending["detectors"]]);

  useEffect(() => {
    const modelPending = childPending["model"];
    if (modelPending) {
      setState((prev) =>
        prev ? { ...prev, customModel: modelPending } : prev,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childPending["model"]]);

  useEffect(() => {
    if (!config || snapshot !== null) return;
    const initial = deriveInitialState(config);
    setSnapshot(initial);
    setState(initial);
  }, [config, snapshot]);

  const isDirty = useMemo(() => {
    if (!state || !snapshot) return false;
    return JSON.stringify(state) !== JSON.stringify(snapshot);
  }, [state, snapshot]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  useEffect(() => {
    document.title = t("documentTitle.detectorsAndModel");
  }, [t]);

  const onSave = useCallback(async () => {
    if (!state || !snapshot) return;

    const detectorChanged = !isEqual(state.detectors, snapshot.detectors);
    const tabChanged = state.modelTab !== snapshot.modelTab;

    const modelPayload =
      state.modelTab === "plus"
        ? { path: `plus://${state.plusModelId}` }
        : state.customModel;

    setIsSaving(true);
    try {
      if (tabChanged) {
        await axios.put("config/set", {
          requires_restart: 0,
          config_data: { model: null },
        });
      }

      await axios.put("config/set", {
        requires_restart: detectorChanged ? 1 : 0,
        config_data: {
          detectors: state.detectors,
          model: modelPayload,
        },
      });

      await globalMutate("config");
      await globalMutate("config/raw_paths");

      // Re-derive snapshot from the freshly saved state so isDirty resets.
      setSnapshot({ ...state });
      setChildPending({});

      if (detectorChanged) {
        toast.success(t("detectorsAndModel.toast.saveSuccessRestart"), {
          position: "top-center",
          action: (
            <Button onClick={() => setRestartDialogOpen(true)}>
              {t("restart.button", { ns: "components/dialog" })}
            </Button>
          ),
        });
      } else {
        toast.success(t("detectorsAndModel.toast.saveSuccess"), {
          position: "top-center",
        });
      }
    } catch (error) {
      const err = error as {
        response?: { data?: { message?: string; detail?: string } };
      };
      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        t("detectorsAndModel.toast.saveError");
      toast.error(message, { position: "top-center" });
    } finally {
      setIsSaving(false);
    }
  }, [state, snapshot, globalMutate, t]);

  const onUndo = useCallback(() => {
    if (snapshot) setState(snapshot);
  }, [snapshot]);

  if (!config || !state) {
    return <ActivityIndicator />;
  }

  const saveDisabled =
    !isDirty ||
    isSaving ||
    detectorStatus.hasValidationErrors ||
    (state.modelTab === "custom" && modelStatus.hasValidationErrors) ||
    plusMismatch ||
    plusModelMissing;

  return (
    <div className="flex size-full flex-col md:pr-2">
      <Toaster position="top-center" closeButton={true} />
      <div className="w-full max-w-5xl space-y-6 pt-2">
        <div className="mb-1 flex items-center justify-between gap-4">
          <div className="flex flex-col">
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

        <div className="space-y-6">
          <SettingsGroupCard title={t("detectorsAndModel.cardTitles.detector")}>
            <ConfigSectionTemplate
              sectionKey="detectors"
              level="global"
              showOverrideIndicator={false}
              showTitle={false}
              embedded
              pendingDataBySection={childPending}
              onPendingDataChange={handleChildPendingChange}
              onStatusChange={handleDetectorStatusChange}
            />
          </SettingsGroupCard>
          {plusMismatch && selectedPlusModel && (
            <div className="rounded-md border border-danger bg-danger/10 px-4 py-3 text-sm text-danger">
              <Trans
                ns="views/settings"
                i18nKey="detectorsAndModel.mismatch.warning"
                values={{
                  model: selectedPlusModel.name,
                  required: selectedPlusModel.supportedDetectors.join(", "),
                }}
                components={{
                  0: <strong />,
                  1: <strong />,
                }}
              />
            </div>
          )}
          <SettingsGroupCard title={t("detectorsAndModel.cardTitles.model")}>
            <Tabs
              value={state.modelTab}
              onValueChange={(value) =>
                setState((prev) =>
                  prev ? { ...prev, modelTab: value as ModelTab } : prev,
                )
              }
            >
              <TabsList className="mb-4">
                <TabsTrigger value="plus" disabled={!plusEnabled}>
                  {t("detectorsAndModel.tabs.plus")}
                </TabsTrigger>
                <TabsTrigger value="custom">
                  {t("detectorsAndModel.tabs.custom")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="plus">
                {!plusEnabled ? (
                  <p className="py-4 text-sm text-muted-foreground">
                    {t("detectorsAndModel.plusModel.plusDisabled")}
                  </p>
                ) : (
                  <div className="flex w-full items-center gap-2">
                    <Select
                      value={state.plusModelId}
                      onValueChange={(value) =>
                        setState((prev) =>
                          prev ? { ...prev, plusModelId: value } : prev,
                        )
                      }
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
                            ? t("frigatePlus.modelInfo.loadingAvailableModels")
                            : t("detectorsAndModel.plusModel.noModelSelected")}
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
                                          model.supportedDetectors.join(", "),
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
                )}
              </TabsContent>

              <TabsContent value="custom">
                <ConfigSectionTemplate
                  sectionKey="model"
                  level="global"
                  showOverrideIndicator={false}
                  showTitle={false}
                  embedded
                  pendingDataBySection={childPending}
                  onPendingDataChange={handleChildPendingChange}
                  onStatusChange={handleModelStatusChange}
                />
              </TabsContent>
            </Tabs>
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
