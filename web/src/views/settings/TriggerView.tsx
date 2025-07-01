import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Toaster, toast } from "sonner";
import useSWR from "swr";
import axios from "axios";
import { Button } from "@/components/ui/button";
import Heading from "@/components/ui/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LuPlus, LuTrash, LuPencil } from "react-icons/lu";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import CreateTriggerDialog from "@/components/overlay/CreateTriggerDialog";
import DeleteTriggerDialog from "@/components/overlay/DeleteTriggerDialog";
import { FrigateConfig } from "@/types/frigateConfig";
import { Trigger, TriggerAction, TriggerType } from "@/types/trigger";

type ConfigSetBody = {
  requires_restart: number;
  config_data: {
    cameras: {
      [key: string]: {
        semantic_search?: {
          triggers?: {
            [key: string]:
              | {
                  type: string;
                  data: string;
                  threshold: number;
                  actions: string[];
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
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      name,
      type: trigger.type,
      data: trigger.data,
      threshold: trigger.threshold,
      actions: trigger.actions,
    }));
  }, [config, selectedCamera]);

  useEffect(() => {
    document.title = t("triggers.documentTitle");
  }, [t]);

  const saveToConfig = useCallback(
    (trigger: Trigger, isEdit: boolean) => {
      setIsLoading(true);
      const { name, type, data, threshold, actions } = trigger;
      const embeddingBody: TriggerEmbeddingBody = { type, data, threshold };
      const embeddingUrl = isEdit
        ? `/trigger/embedding/${selectedCamera}/${name}`
        : `/trigger/embedding?camera=${selectedCamera}&name=${name}`;
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
                          type,
                          data,
                          threshold,
                          actions,
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
        });
    },
    [t, updateConfig, selectedCamera, setUnsavedChanges],
  );

  const onCreate = useCallback(
    (
      name: string,
      type: TriggerType,
      data: string,
      threshold: number,
      actions: TriggerAction[],
    ) => {
      setUnsavedChanges(true);
      saveToConfig({ name, type, data, threshold, actions }, false);
      setShowCreate(false);
    },
    [saveToConfig, setUnsavedChanges],
  );

  const onEdit = useCallback(
    (trigger: Trigger) => {
      setUnsavedChanges(true);
      if (selectedTrigger?.name && selectedTrigger.name !== trigger.name) {
        // Handle rename by deleting old trigger
        axios
          .delete(
            `/trigger/embedding/${selectedCamera}/${selectedTrigger.name}`,
          )
          .then((embeddingResponse) => {
            if (embeddingResponse.data.success) {
              return saveToConfig(trigger, true);
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
            setIsLoading(false);
          });
      } else {
        saveToConfig(trigger, true);
      }
      setShowCreate(false);
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
                  setShowDelete(false);
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
      <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
        <div className="mb-5 flex flex-row items-center justify-between gap-2">
          <div className="flex flex-col items-start">
            <Heading as="h3" className="my-2">
              {t("triggers.management.title")}
            </Heading>
            <p className="text-sm text-muted-foreground">
              {t("triggers.management.desc", { camera: selectedCamera })}
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
            <div className="h-full overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[200px]">
                      {t("triggers.table.name")}
                    </TableHead>
                    <TableHead>{t("triggers.table.type")}</TableHead>
                    <TableHead>{t("triggers.table.content")}</TableHead>
                    <TableHead>{t("triggers.table.threshold")}</TableHead>
                    <TableHead>{t("triggers.table.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {triggers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        {t("triggers.table.noTriggers")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    triggers.map((trigger) => (
                      <TableRow key={trigger.name} className="group">
                        <TableCell className="font-medium">
                          {trigger.name}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>
                          {trigger.type === "thumbnail"
                            ? trigger.data
                            : trigger.data.length > 30
                              ? `${trigger.data.substring(0, 30)}...`
                              : trigger.data}
                        </TableCell>
                        <TableCell className="font-medium">
                          {trigger.threshold.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {trigger.actions
                            .map((action) => t(`triggers.actions.${action}`))
                            .join(", ")}
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
                                      {t("button.delete", { ns: "common" })}
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
      </div>
      <CreateTriggerDialog
        show={showCreate}
        trigger={selectedTrigger}
        selectedCamera={selectedCamera}
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
