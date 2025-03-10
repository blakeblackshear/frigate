import Heading from "@/components/ui/heading";
import { FrigateConfig, SearchModelSize } from "@/types/frigateConfig";
import useSWR from "swr";
import axios from "axios";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useCallback, useContext, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { LuExternalLink } from "react-icons/lu";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";

type ExploreSettingsViewProps = {
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

type ExploreSettings = {
  enabled?: boolean;
  reindex?: boolean;
  model_size?: SearchModelSize;
};

export default function ExploreSettingsView({
  setUnsavedChanges,
}: ExploreSettingsViewProps) {
  const { t } = useTranslation("views/settings");
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const [changedValue, setChangedValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  const [ExploreSettings, setExploreSettings] = useState<ExploreSettings>({
    enabled: undefined,
    reindex: undefined,
    model_size: undefined,
  });

  const [origExploreSettings, setOrigExploreSettings] =
    useState<ExploreSettings>({
      enabled: undefined,
      reindex: undefined,
      model_size: undefined,
    });

  useEffect(() => {
    if (config) {
      if (ExploreSettings?.enabled == undefined) {
        setExploreSettings({
          enabled: config.semantic_search.enabled,
          reindex: config.semantic_search.reindex,
          model_size: config.semantic_search.model_size,
        });
      }

      setOrigExploreSettings({
        enabled: config.semantic_search.enabled,
        reindex: config.semantic_search.reindex,
        model_size: config.semantic_search.model_size,
      });
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleSearchConfigChange = (newConfig: Partial<ExploreSettings>) => {
    setExploreSettings((prevConfig) => ({ ...prevConfig, ...newConfig }));
    setUnsavedChanges(true);
    setChangedValue(true);
  };

  const saveToConfig = useCallback(async () => {
    setIsLoading(true);

    axios
      .put(
        `config/set?semantic_search.enabled=${ExploreSettings.enabled ? "True" : "False"}&semantic_search.reindex=${ExploreSettings.reindex ? "True" : "False"}&semantic_search.model_size=${ExploreSettings.model_size}`,
        {
          requires_restart: 0,
        },
      )
      .then((res) => {
        if (res.status === 200) {
          toast.success(t("explore.toast.success"), {
            position: "top-center",
          });
          setChangedValue(false);
          updateConfig();
        } else {
          toast.error(t("toast.save.error", { errorMessage: res.statusText }), {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("toast.save.error", {
            errorMessage,
          }),
          {
            position: "top-center",
          },
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    updateConfig,
    ExploreSettings.enabled,
    ExploreSettings.reindex,
    ExploreSettings.model_size,
    t,
  ]);

  const onCancel = useCallback(() => {
    setExploreSettings(origExploreSettings);
    setChangedValue(false);
    removeMessage("search_settings", "search_settings");
  }, [origExploreSettings, removeMessage]);

  useEffect(() => {
    if (changedValue) {
      addMessage(
        "search_settings",
        `Unsaved Explore settings changes`,
        undefined,
        "search_settings",
      );
    } else {
      removeMessage("search_settings", "search_settings");
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedValue]);

  useEffect(() => {
    document.title = "Explore Settings - Frigate";
  }, []);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
        <Heading as="h3" className="my-2">
          {t("explore.title")}
        </Heading>
        <Separator className="my-2 flex bg-secondary" />
        <Heading as="h4" className="my-2">
          {t("explore.semanticSearch.title")}
        </Heading>
        <div className="max-w-6xl">
          <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
            <p>{t("explore.semanticSearch.desc")}</p>

            <div className="flex items-center text-primary">
              <Link
                to="https://docs.frigate.video/configuration/semantic_search"
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                {t("explore.semanticSearch.readTheDocumentation")}
                <LuExternalLink className="ml-2 inline-flex size-3" />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex w-full max-w-lg flex-col space-y-6">
          <div className="flex flex-row items-center">
            <Switch
              id="enabled"
              className="mr-3"
              disabled={ExploreSettings.enabled === undefined}
              checked={ExploreSettings.enabled === true}
              onCheckedChange={(isChecked) => {
                handleSearchConfigChange({ enabled: isChecked });
              }}
            />
            <div className="space-y-0.5">
              <Label htmlFor="enabled">{t("button.enabled")}</Label>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex flex-row items-center">
              <Switch
                id="reindex"
                className="mr-3"
                disabled={ExploreSettings.reindex === undefined}
                checked={ExploreSettings.reindex === true}
                onCheckedChange={(isChecked) => {
                  handleSearchConfigChange({ reindex: isChecked });
                }}
              />
              <div className="space-y-0.5">
                <Label htmlFor="reindex">
                  {t("explore.semanticSearch.reindexOnStartup.label")}
                </Label>
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {t("explore.semanticSearch.reindexOnStartup.desc")}
            </div>
          </div>
          <div className="mt-2 flex flex-col space-y-6">
            <div className="space-y-0.5">
              <div className="text-md">
                {t("explore.semanticSearch.modelSize.label")}
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>{t("explore.semanticSearch.modelSize.desc")}</p>
                <ul className="list-disc pl-5 text-sm">
                  <li>{t("explore.semanticSearch.modelSize.small.desc")}</li>
                  <li>{t("explore.semanticSearch.modelSize.large.desc")}</li>
                </ul>
              </div>
            </div>
            <Select
              value={ExploreSettings.model_size}
              onValueChange={(value) =>
                handleSearchConfigChange({
                  model_size: value as SearchModelSize,
                })
              }
            >
              <SelectTrigger className="w-20">
                {t(
                  "explore.semanticSearch.modelSize." +
                    ExploreSettings.model_size,
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {["small", "large"].map((size) => (
                    <SelectItem
                      key={size}
                      className="cursor-pointer"
                      value={size}
                    >
                      {t("explore.semanticSearch.modelSize." + size)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator className="my-2 flex bg-secondary" />

        <div className="flex w-full flex-row items-center gap-2 pt-2 md:w-[25%]">
          <Button className="flex flex-1" aria-label="Reset" onClick={onCancel}>
            {t("button.reset")}
          </Button>
          <Button
            variant="select"
            disabled={!changedValue || isLoading}
            className="flex flex-1"
            aria-label="Save"
            onClick={saveToConfig}
          >
            {isLoading ? (
              <div className="flex flex-row items-center gap-2">
                <ActivityIndicator />
                <span>{t("button.saving")}</span>
              </div>
            ) : (
              t("button.save")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
