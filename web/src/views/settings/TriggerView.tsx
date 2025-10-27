import { useCallback, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Toaster, toast } from "sonner";
import useSWR from "swr";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Heading from "@/components/ui/heading";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LuPlus,
  LuTrash,
  LuPencil,
  LuSearch,
  LuExternalLink,
} from "react-icons/lu";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import TriggerWizardDialog from "@/components/trigger/TriggerWizardDialog";
import CreateTriggerDialog from "@/components/overlay/CreateTriggerDialog";
import DeleteTriggerDialog from "@/components/overlay/DeleteTriggerDialog";
import { FrigateConfig } from "@/types/frigateConfig";
import { Trigger, TriggerAction, TriggerType } from "@/types/trigger";
import { useSearchEffect } from "@/hooks/use-overlay-state";
import { cn } from "@/lib/utils";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import { Link } from "react-router-dom";
import { useTriggers } from "@/api/ws";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import { CiCircleAlert } from "react-icons/ci";
import { useDocDomain } from "@/hooks/use-doc-domain";

type ConfigSetBody = {
  requires_restart: number;
  config_data: {
    cameras: {
      [key: string]: {
        semantic_search?: {
          triggers?: {
            [key: string]:
              | {
                  enabled: boolean;
                  type: string;
                  data: string;
                  threshold: number;
                  actions: string[];
                  friendly_name?: string;
                }
              | "";
          };
        };
      };
    };
  };
  update_topic?: string;
};

type TriggerEmbeddingBody = {
  type: TriggerType;
  data: string;
  threshold: number;
};

type TriggerViewProps = {
  selectedCamera: string;
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function TriggerView({
  selectedCamera,
  setUnsavedChanges,
}: TriggerViewProps) {
  const { t } = useTranslation("views/settings");
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const { data: trigger_status, mutate } = useSWR(
    config?.cameras[selectedCamera]?.semantic_search?.triggers &&
      Object.keys(config.cameras[selectedCamera].semantic_search.triggers)
        .length > 0
      ? `/triggers/status/${selectedCamera}`
      : null,
    {
      revalidateOnFocus: false,
    },
  );
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);
  const [triggeredTrigger, setTriggeredTrigger] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const cameraName = useCameraFriendlyName(selectedCamera);
  const isSemanticSearchEnabled = config?.semantic_search?.enabled ?? false;

  const { getLocaleDocUrl } = useDocDomain();

  const triggers = useMemo(() => {
    if (
      !config ||
      !selectedCamera ||
      !config.cameras[selectedCamera]?.semantic_search?.triggers
    ) {
      return [];
    }
    return Object.entries(
      config.cameras[selectedCamera].semantic_search.triggers,
    ).map(([name, trigger]) => ({
      enabled: trigger.enabled,
      name,
      friendly_name: trigger.friendly_name,
      type: trigger.type,
      data: trigger.data,
      threshold: trigger.threshold,
      actions: trigger.actions,
    }));
  }, [config, selectedCamera]);

  // watch websocket for updates
  const { payload: triggers_status_ws } = useTriggers();

  useEffect(() => {
    if (!triggers_status_ws) return;

    mutate();

    setTriggeredTrigger(triggers_status_ws.name);
    const target = document.querySelector(
      `#trigger-${triggers_status_ws.name}`,
    );
    if (target) {
      target.scrollIntoView({
        block: "center",
        behavior: "smooth",
        inline: "nearest",
      });
      const ring = target.querySelector(".trigger-ring");
      if (ring) {
        ring.classList.add(`outline-selected`);
        ring.classList.remove("outline-transparent");

        const timeout = setTimeout(() => {
          ring.classList.remove(`outline-selected`);
          ring.classList.add("outline-transparent");
        }, 3000);
        return () => clearTimeout(timeout);
      }
    }
  }, [triggers_status_ws, selectedCamera, mutate]);

  useEffect(() => {
    document.title = t("triggers.documentTitle");
  }, [t]);

  const saveToConfig = useCallback(
    (trigger: Trigger, isEdit: boolean) => {
      setIsLoading(true);
      const { enabled, name, type, data, threshold, actions, friendly_name } =
        trigger;
      const embeddingBody: TriggerEmbeddingBody = { type, data, threshold };
      const embeddingUrl = isEdit
        ? `/trigger/embedding/${selectedCamera}/${name}`
        : `/trigger/embedding?camera_name=${selectedCamera}&name=${name}`;
      const embeddingMethod = isEdit ? axios.put : axios.post;

      embeddingMethod(embeddingUrl, embeddingBody)
        .then((embeddingResponse) => {
          if (embeddingResponse.data.success) {
            const configBody: ConfigSetBody = {
              requires_restart: 0,
              config_data: {
                cameras: {
                  [selectedCamera]: {
                    semantic_search: {
                      triggers: {
                        [name]: {
                          enabled,
                          type,
                          data,
                          threshold,
                          actions,
                          friendly_name,
                        },
                      },
                    },
                  },
                },
              },
              update_topic: `config/cameras/${selectedCamera}/semantic_search`,
            };

            return axios
              .put("config/set", configBody)
              .then((configResponse) => {
                if (configResponse.status === 200) {
                  updateConfig();
                  toast.success(
                    t(
                      isEdit
                        ? "triggers.toast.success.updateTrigger"
                        : "triggers.toast.success.createTrigger",
                      { name },
                    ),
                    { position: "top-center" },
                  );
                  setUnsavedChanges(false);
                } else {
                  throw new Error(configResponse.statusText);
                }
              });
          } else {
            throw new Error(embeddingResponse.data.message);
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("toast.save.error.title", { errorMessage, ns: "common" }),
            { position: "top-center" },
          );
        })
        .finally(() => {
          setIsLoading(false);
          setShowCreate(false);
        });
    },
    [t, updateConfig, selectedCamera, setUnsavedChanges],
  );

  const onCreate = useCallback(
    (
      enabled: boolean,
      name: string,
      type: TriggerType,
      data: string,
      threshold: number,
      actions: TriggerAction[],
      friendly_name: string,
    ) => {
      setUnsavedChanges(true);
      saveToConfig(
        {
          enabled,
          name,
          type,
          data,
          threshold,
          actions,
          friendly_name,
        },
        false,
      );
    },
    [saveToConfig, setUnsavedChanges],
  );

  const onEdit = useCallback(
    (trigger: Trigger) => {
      setUnsavedChanges(true);
      setIsLoading(true);
      if (selectedTrigger?.name && selectedTrigger.name !== trigger.name) {
        // Handle rename: delete old trigger, update config, then save new trigger
        axios
          .delete(
            `/trigger/embedding/${selectedCamera}/${selectedTrigger.name}`,
          )
          .then((embeddingResponse) => {
            if (!embeddingResponse.data.success) {
              throw new Error(embeddingResponse.data.message);
            }
            const deleteConfigBody: ConfigSetBody = {
              requires_restart: 0,
              config_data: {
                cameras: {
                  [selectedCamera]: {
                    semantic_search: {
                      triggers: {
                        [selectedTrigger.name]: "",
                      },
                    },
                  },
                },
              },
              update_topic: `config/cameras/${selectedCamera}/semantic_search`,
            };
            return axios.put("config/set", deleteConfigBody);
          })
          .then((configResponse) => {
            if (configResponse.status !== 200) {
              throw new Error(configResponse.statusText);
            }
            // Save new trigger
            saveToConfig(trigger, false);
          })
          .catch((error) => {
            const errorMessage =
              error.response?.data?.message ||
              error.response?.data?.detail ||
              "Unknown error";
            toast.error(
              t("toast.save.error.title", { errorMessage, ns: "common" }),
              { position: "top-center" },
            );
            setIsLoading(false);
          });
      } else {
        // Regular update without rename
        saveToConfig(trigger, true);
      }
      setSelectedTrigger(null);
    },
    [t, saveToConfig, selectedCamera, selectedTrigger, setUnsavedChanges],
  );

  const onDelete = useCallback(
    (name: string) => {
      setUnsavedChanges(true);
      setIsLoading(true);
      axios
        .delete(`/trigger/embedding/${selectedCamera}/${name}`)
        .then((embeddingResponse) => {
          if (embeddingResponse.data.success) {
            const configBody: ConfigSetBody = {
              requires_restart: 0,
              config_data: {
                cameras: {
                  [selectedCamera]: {
                    semantic_search: {
                      triggers: {
                        [name]: "",
                      },
                    },
                  },
                },
              },
              update_topic: `config/cameras/${selectedCamera}/semantic_search`,
            };

            return axios
              .put("config/set", configBody)
              .then((configResponse) => {
                if (configResponse.status === 200) {
                  updateConfig();
                  toast.success(
                    t("triggers.toast.success.deleteTrigger", { name }),
                    {
                      position: "top-center",
                    },
                  );
                  setUnsavedChanges(false);
                } else {
                  throw new Error(configResponse.statusText);
                }
              });
          } else {
            throw new Error(embeddingResponse.data.message);
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("triggers.toast.error.deleteTriggerFailed", { errorMessage }),
            { position: "top-center" },
          );
        })
        .finally(() => {
          setShowDelete(false);
          setIsLoading(false);
        });
    },
    [t, updateConfig, selectedCamera, setUnsavedChanges],
  );

  useEffect(() => {
    if (selectedCamera) {
      setSelectedTrigger(null);
      setShowCreate(false);
      setShowDelete(false);
      setUnsavedChanges(false);
    }
  }, [selectedCamera, setUnsavedChanges]);

  // for adding a trigger with event id via explore context menu

  useSearchEffect("event_id", (eventId: string) => {
    if (!config || isLoading || !isSemanticSearchEnabled) {
      return false;
    }
    setShowCreate(true);
    setSelectedTrigger({
      enabled: true,
      name: "",
      type: "thumbnail",
      data: eventId,
      threshold: 0.5,
      actions: [],
    });
    return true;
  });

  if (!config || !selectedCamera) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ActivityIndicator />
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto pb-2 md:order-none md:mr-3 md:mt-0">
        {!isSemanticSearchEnabled ? (
          <div className="mb-5 flex flex-row items-center justify-between gap-2">
            <div className="flex flex-col items-start">
              <Heading as="h4" className="mb-2">
                {t("triggers.management.title")}
              </Heading>
              <p className="mb-5 text-sm text-muted-foreground">
                {t("triggers.management.desc", {
                  camera: cameraName,
                })}
              </p>
              <Alert variant="destructive">
                <CiCircleAlert className="size-5" />
                <AlertTitle>{t("triggers.semanticSearch.title")}</AlertTitle>
                <AlertDescription>
                  <Trans ns="views/settings">
                    triggers.semanticSearch.desc
                  </Trans>
                  <div className="mt-3 flex items-center">
                    <Link
                      to={getLocaleDocUrl("configuration/semantic_search")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline"
                    >
                      {t("readTheDocumentation", { ns: "common" })}{" "}
                      <LuExternalLink className="ml-2 inline-flex size-3" />
                    </Link>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-row items-center justify-between gap-2">
              <div className="flex flex-col items-start">
                <Heading as="h4" className="mb-2">
                  {t("triggers.management.title")}
                </Heading>
                <p className="text-sm text-muted-foreground">
                  {t("triggers.management.desc", {
                    camera: cameraName,
                  })}
                </p>
              </div>
              <Button
                className="flex items-center gap-2 self-start sm:self-auto"
                aria-label={t("triggers.addTrigger")}
                variant="default"
                onClick={() => {
                  setSelectedTrigger(null);
                  setShowCreate(true);
                }}
                disabled={isLoading}
              >
                <LuPlus className="size-4" />
                {t("triggers.addTrigger")}
              </Button>
            </div>
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="scrollbar-container flex-1 overflow-hidden rounded-lg border border-border bg-background_alt">
                <div className="h-full overflow-auto p-0">
                  {triggers.length === 0 ? (
                    <div className="flex h-24 items-center justify-center">
                      <p className="text-center text-muted-foreground">
                        {t("triggers.table.noTriggers")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {triggers.map((trigger) => (
                        <div
                          key={trigger.name}
                          id={`trigger-${trigger.name}`}
                          className="relative flex items-center justify-between rounded-lg border border-border bg-background p-4 transition-all"
                        >
                          <div
                            className={cn(
                              "trigger-ring pointer-events-none absolute inset-0 z-10 size-full rounded-md outline outline-[3px] -outline-offset-[2.8px] duration-500",
                              triggeredTrigger === trigger.name
                                ? "shadow-selected outline-selected"
                                : "outline-transparent duration-500",
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <h3
                              className={cn(
                                "truncate text-lg font-medium",
                                !trigger.enabled && "opacity-60",
                              )}
                            >
                              {trigger.friendly_name || trigger.name}
                            </h3>
                            <div
                              className={cn(
                                "mt-1 flex flex-col gap-1 text-sm text-muted-foreground md:flex-row md:items-center md:gap-3",
                                !trigger.enabled && "opacity-60",
                              )}
                            >
                              <div>
                                <Badge
                                  variant={
                                    trigger.type === "thumbnail"
                                      ? "default"
                                      : "outline"
                                  }
                                  className={
                                    trigger.type === "thumbnail"
                                      ? "bg-primary/20 text-primary hover:bg-primary/30"
                                      : ""
                                  }
                                >
                                  {t(`triggers.type.${trigger.type}`)}
                                </Badge>
                              </div>

                              <Link
                                to={`/explore?event_id=${trigger_status?.triggers[trigger.name]?.triggering_event_id || ""}`}
                                className={cn(
                                  "text-sm",
                                  !trigger_status?.triggers[trigger.name]
                                    ?.triggering_event_id &&
                                    "pointer-events-none",
                                )}
                              >
                                <div className="flex flex-row items-center">
                                  {t("triggers.table.lastTriggered")}:{" "}
                                  {trigger_status &&
                                  trigger_status.triggers[trigger.name]
                                    ?.last_triggered
                                    ? formatUnixTimestampToDateTime(
                                        trigger_status.triggers[trigger.name]
                                          ?.last_triggered,
                                        {
                                          timezone: config.ui.timezone,
                                          date_format:
                                            config.ui.time_format == "24hour"
                                              ? t(
                                                  "time.formattedTimestamp2.24hour",
                                                  {
                                                    ns: "common",
                                                  },
                                                )
                                              : t(
                                                  "time.formattedTimestamp2.12hour",
                                                  {
                                                    ns: "common",
                                                  },
                                                ),
                                          time_style: "medium",
                                          date_style: "medium",
                                        },
                                      )
                                    : "Never"}
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <LuSearch className="ml-2 size-3.5" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {t("details.item.button.viewInExplore", {
                                        ns: "views/explore",
                                      })}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </Link>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() => {
                                      setSelectedTrigger(trigger);
                                      setShowCreate(true);
                                    }}
                                    disabled={isLoading}
                                  >
                                    <LuPencil className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("triggers.table.edit")}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 w-8 p-0 text-white"
                                    onClick={() => {
                                      setSelectedTrigger(trigger);
                                      setShowDelete(true);
                                    }}
                                    disabled={isLoading}
                                  >
                                    <LuTrash className="size-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t("triggers.table.deleteTrigger")}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <TriggerWizardDialog
        open={showCreate && (!selectedTrigger || selectedTrigger.name === "")}
        onClose={() => {
          setShowCreate(false);
          setSelectedTrigger(null);
          setUnsavedChanges(false);
        }}
        selectedCamera={selectedCamera}
        trigger={null}
        onCreate={onCreate}
        onEdit={onEdit}
        isLoading={isLoading}
      />
      <CreateTriggerDialog
        show={showCreate && !!selectedTrigger && selectedTrigger.name !== ""}
        trigger={selectedTrigger}
        selectedCamera={selectedCamera}
        isLoading={isLoading}
        onCreate={onCreate}
        onEdit={onEdit}
        onCancel={() => {
          setShowCreate(false);
          setSelectedTrigger(null);
          setUnsavedChanges(false);
        }}
      />
      <DeleteTriggerDialog
        show={showDelete}
        triggerName={selectedTrigger?.name ?? ""}
        isLoading={isLoading}
        onCancel={() => {
          setShowDelete(false);
          setSelectedTrigger(null);
          setUnsavedChanges(false);
        }}
        onDelete={() => onDelete(selectedTrigger?.name ?? "")}
      />
    </div>
  );
}
