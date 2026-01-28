import { useCallback, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LuPlus,
  LuTrash,
  LuPencil,
  LuSearch,
  LuExternalLink,
  LuCircle,
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
import { isDesktop } from "react-device-detect";

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
  const [triggeredTrigger, setTriggeredTrigger] = useState<string[]>([]);
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

    setTriggeredTrigger((prev) => {
      const current = prev || [];
      if (!current.includes(triggers_status_ws.name)) {
        const newTriggers = [...current, triggers_status_ws.name];
        return newTriggers;
      }
      return current;
    });

    const timeout = setTimeout(() => {
      setTriggeredTrigger((prev) =>
        (prev || []).filter((name) => name !== triggers_status_ws.name),
      );
    }, 3000);

    return () => clearTimeout(timeout);
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
              .then(async (configResponse) => {
                if (configResponse.status === 200) {
                  await updateConfig();
                  const displayName =
                    friendly_name && friendly_name !== ""
                      ? `${friendly_name} (${name})`
                      : name;

                  toast.success(
                    t(
                      isEdit
                        ? "triggers.toast.success.updateTrigger"
                        : "triggers.toast.success.createTrigger",
                      { name: displayName },
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
          setSelectedTrigger(null);
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
              .then(async (configResponse) => {
                if (configResponse.status === 200) {
                  await updateConfig();
                  const friendly =
                    config?.cameras?.[selectedCamera]?.semantic_search
                      ?.triggers?.[name]?.friendly_name;

                  const displayName =
                    friendly && friendly !== ""
                      ? `${friendly} (${name})`
                      : name;

                  toast.success(
                    t("triggers.toast.success.deleteTrigger", {
                      name: displayName,
                    }),
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
    [t, updateConfig, selectedCamera, setUnsavedChanges, config],
  );

  useEffect(() => {
    if (selectedCamera) {
      setSelectedTrigger(null);
      setShowCreate(false);
      setShowDelete(false);
      setUnsavedChanges(false);
      setTriggeredTrigger([]);
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
      name: eventId,
      friendly_name: "",
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
      <div
        className={cn(
          "scrollbar-container order-last mb-2 mt-2 flex h-full w-full flex-col overflow-y-auto pb-2",
          isDesktop && "order-none mr-3 mt-0",
        )}
      >
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
              <div className="flex flex-1 flex-col gap-2 md:hidden">
                {triggers.length === 0 ? (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-border bg-background_alt">
                    <p className="text-center text-muted-foreground">
                      {t("triggers.table.noTriggers")}
                    </p>
                  </div>
                ) : (
                  triggers.map((trigger) => (
                    <div
                      key={trigger.name}
                      id={`trigger-${trigger.name}`}
                      className="rounded-lg border border-border bg-background p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <LuCircle
                              className={cn(
                                "size-3 duration-500",
                                triggeredTrigger.includes(trigger.name)
                                  ? "fill-selected text-selected"
                                  : "fill-muted text-muted dark:fill-secondary-highlight dark:text-secondary-highlight",
                              )}
                            />
                          </div>
                          <div className="flex-1">
                            <div
                              className={cn(
                                "font-medium",
                                !trigger.enabled && "opacity-60",
                              )}
                            >
                              {trigger.friendly_name || trigger.name}
                            </div>
                            <div className="mt-2 flex flex-col gap-2">
                              <Badge
                                variant={
                                  trigger.type === "thumbnail"
                                    ? "default"
                                    : "outline"
                                }
                                className={cn(
                                  "w-fit",
                                  trigger.type === "thumbnail"
                                    ? "bg-primary/20 text-primary hover:bg-primary/30"
                                    : "",
                                  !trigger.enabled && "opacity-60",
                                )}
                              >
                                {t(`triggers.type.${trigger.type}`)}
                              </Badge>
                              <Link
                                to={`/explore?event_id=${trigger_status?.triggers[trigger.name]?.triggering_event_id || ""}`}
                                className={cn(
                                  "flex items-center gap-1.5 text-xs text-muted-foreground",
                                  !trigger_status?.triggers[trigger.name]
                                    ?.triggering_event_id &&
                                    "pointer-events-none",
                                  !trigger.enabled && "opacity-60",
                                )}
                              >
                                <span>
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
                                    : t("time.never", { ns: "common" })}
                                </span>
                                {trigger_status?.triggers[trigger.name]
                                  ?.triggering_event_id && (
                                  <LuSearch className="size-3" />
                                )}
                              </Link>
                            </div>
                          </div>
                        </div>
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
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
                                  className="h-8 w-8 p-0"
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
                          </div>
                        </TooltipProvider>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View */}
              <div className="scrollbar-container hidden flex-1 overflow-hidden rounded-lg border border-border bg-background_alt md:block">
                <div className="h-full overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted/50">
                      <TableRow>
                        <TableHead className="w-4"></TableHead>
                        <TableHead>{t("triggers.table.name")}</TableHead>
                        <TableHead>{t("triggers.table.type")}</TableHead>
                        <TableHead>
                          {t("triggers.table.lastTriggered")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("triggers.table.actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {triggers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            {t("triggers.table.noTriggers")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        triggers.map((trigger) => (
                          <TableRow
                            key={trigger.name}
                            id={`trigger-${trigger.name}`}
                            className="group"
                          >
                            <TableCell>
                              <LuCircle
                                className={cn(
                                  "size-3 duration-500",
                                  triggeredTrigger.includes(trigger.name)
                                    ? "fill-selected text-selected"
                                    : "fill-muted text-muted dark:fill-secondary-highlight dark:text-secondary-highlight",
                                )}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div
                                className={cn(!trigger.enabled && "opacity-60")}
                              >
                                {trigger.friendly_name || trigger.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  trigger.type === "thumbnail"
                                    ? "default"
                                    : "outline"
                                }
                                className={cn(
                                  trigger.type === "thumbnail"
                                    ? "bg-primary/20 text-primary hover:bg-primary/30"
                                    : "",
                                  !trigger.enabled && "opacity-60",
                                )}
                              >
                                {t(`triggers.type.${trigger.type}`)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Link
                                to={`/explore?event_id=${trigger_status?.triggers[trigger.name]?.triggering_event_id || ""}`}
                                className={cn(
                                  "flex items-center gap-1.5 text-sm",
                                  !trigger_status?.triggers[trigger.name]
                                    ?.triggering_event_id &&
                                    "pointer-events-none",
                                  !trigger.enabled && "opacity-60",
                                )}
                              >
                                <span>
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
                                    : t("time.never", { ns: "common" })}
                                </span>
                                {trigger_status?.triggers[trigger.name]
                                  ?.triggering_event_id && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <LuSearch className="size-3.5" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {t("details.item.button.viewInExplore", {
                                        ns: "views/explore",
                                      })}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">
                              <TooltipProvider>
                                <div className="flex items-center justify-end gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 px-2"
                                        onClick={() => {
                                          setSelectedTrigger(trigger);
                                          setShowCreate(true);
                                        }}
                                        disabled={isLoading}
                                      >
                                        <LuPencil className="size-3.5" />
                                        <span className="ml-1.5 hidden sm:inline-block">
                                          {t("triggers.table.edit")}
                                        </span>
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
                                        className="h-8 px-2"
                                        onClick={() => {
                                          setSelectedTrigger(trigger);
                                          setShowDelete(true);
                                        }}
                                        disabled={isLoading}
                                      >
                                        <LuTrash className="size-3.5" />
                                        <span className="ml-1.5 hidden sm:inline-block">
                                          {t("triggers.table.deleteTrigger")}
                                        </span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t("triggers.table.deleteTrigger")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
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
        triggerName={
          selectedTrigger
            ? selectedTrigger.friendly_name &&
              selectedTrigger.friendly_name !== ""
              ? `${selectedTrigger.friendly_name} (${selectedTrigger.name})`
              : selectedTrigger.name
            : ""
        }
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
