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
import { Trans } from "react-i18next";
import { t } from "i18next";

type SearchSettingsViewProps = {
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
};

type SearchSettings = {
  enabled?: boolean;
  reindex?: boolean;
  model_size?: SearchModelSize;
};

export default function SearchSettingsView({
  setUnsavedChanges,
}: SearchSettingsViewProps) {
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const [changedValue, setChangedValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { addMessage, removeMessage } = useContext(StatusBarMessagesContext)!;

  const [searchSettings, setSearchSettings] = useState<SearchSettings>({
    enabled: undefined,
    reindex: undefined,
    model_size: undefined,
  });

  const [origSearchSettings, setOrigSearchSettings] = useState<SearchSettings>({
    enabled: undefined,
    reindex: undefined,
    model_size: undefined,
  });

  useEffect(() => {
    if (config) {
      if (searchSettings?.enabled == undefined) {
        setSearchSettings({
          enabled: config.semantic_search.enabled,
          reindex: config.semantic_search.reindex,
          model_size: config.semantic_search.model_size,
        });
      }

      setOrigSearchSettings({
        enabled: config.semantic_search.enabled,
        reindex: config.semantic_search.reindex,
        model_size: config.semantic_search.model_size,
      });
    }
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleSearchConfigChange = (newConfig: Partial<SearchSettings>) => {
    setSearchSettings((prevConfig) => ({ ...prevConfig, ...newConfig }));
    setUnsavedChanges(true);
    setChangedValue(true);
  };

  const saveToConfig = useCallback(async () => {
    setIsLoading(true);

    axios
      .put(
        `config/set?semantic_search.enabled=${searchSettings.enabled ? "True" : "False"}&semantic_search.reindex=${searchSettings.reindex ? "True" : "False"}&semantic_search.model_size=${searchSettings.model_size}`,
        {
          requires_restart: 0,
        },
      )
      .then((res) => {
        if (res.status === 200) {
          toast.success("Search settings have been saved.", {
            position: "top-center",
          });
          setChangedValue(false);
          updateConfig();
        } else {
          toast.error(`Failed to save config changes: ${res.statusText}`, {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        toast.error(
          `Failed to save config changes: ${error.response.data.message}`,
          { position: "top-center" },
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [
    updateConfig,
    searchSettings.enabled,
    searchSettings.reindex,
    searchSettings.model_size,
  ]);

  const onCancel = useCallback(() => {
    setSearchSettings(origSearchSettings);
    setChangedValue(false);
    removeMessage("search_settings", "search_settings");
  }, [origSearchSettings, removeMessage]);

  useEffect(() => {
    if (changedValue) {
      addMessage(
        "search_settings",
        `Unsaved search settings changes`,
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
    document.title = "Search Settings - Frigate";
  }, []);

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div className="flex size-full flex-col md:flex-row">
      <Toaster position="top-center" closeButton={true} />
      <div className="scrollbar-container order-last mb-10 mt-2 flex h-full w-full flex-col overflow-y-auto rounded-lg border-[1px] border-secondary-foreground bg-background_alt p-2 md:order-none md:mb-0 md:mr-2 md:mt-0">
        <Heading as="h3" className="my-2">
          <Trans>ui.settingView.searchSettings</Trans>
        </Heading>
        <Separator className="my-2 flex bg-secondary" />
        <Heading as="h4" className="my-2">
          <Trans>ui.settingView.searchSettings.semanticSearch</Trans>
        </Heading>
        <div className="max-w-6xl">
          <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
            <p>
              <Trans>ui.settingView.searchSettings.semanticSearch.desc</Trans>
            </p>

            <div className="flex items-center text-primary">
              <Link
                to="https://docs.frigate.video/configuration/semantic_search"
                target="_blank"
                rel="noopener noreferrer"
                className="inline"
              >
                <Trans>ui.settingView.searchSettings.semanticSearch.readTheDocumentation</Trans>
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
              disabled={searchSettings.enabled === undefined}
              checked={searchSettings.enabled === true}
              onCheckedChange={(isChecked) => {
                handleSearchConfigChange({ enabled: isChecked });
              }}
            />
            <div className="space-y-0.5">
              <Label htmlFor="enabled"><Trans>ui.enabled</Trans></Label>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex flex-row items-center">
              <Switch
                id="reindex"
                className="mr-3"
                disabled={searchSettings.reindex === undefined}
                checked={searchSettings.reindex === true}
                onCheckedChange={(isChecked) => {
                  handleSearchConfigChange({ reindex: isChecked });
                }}
              />
              <div className="space-y-0.5">
                <Label htmlFor="reindex"><Trans>ui.settingView.searchSettings.semanticSearch.reindexOnStartup</Trans></Label>
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              <Trans>ui.settingView.searchSettings.semanticSearch.reindexOnStartup.desc</Trans>
            </div>
          </div>
          <div className="mt-2 flex flex-col space-y-6">
            <div className="space-y-0.5">
              <div className="text-md"><Trans>ui.settingView.searchSettings.semanticSearch.modelSize</Trans></div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <Trans>ui.settingView.searchSettings.semanticSearch.modelSize.desc</Trans>
                </p>
                <ul className="list-disc pl-5 text-sm">
                  <li>
                    <Trans>ui.settingView.searchSettings.semanticSearch.modelSize.small.desc</Trans>
                  </li>
                  <li>
                  <Trans>ui.settingView.searchSettings.semanticSearch.modelSize.large.desc</Trans>
                  </li>
                </ul>
              </div>
            </div>
            <Select
              value={searchSettings.model_size}
              onValueChange={(value) =>
                handleSearchConfigChange({
                  model_size: value as SearchModelSize,
                })
              }
            >
              <SelectTrigger className="w-20">
                {t("ui.settingView.searchSettings.semanticSearch.modelSize." + searchSettings.model_size)}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {["small", "large"].map((size) => (
                    <SelectItem
                      key={size}
                      className="cursor-pointer"
                      value={size}
                    >
                      {t("ui.settingView.searchSettings.semanticSearch.modelSize." + size)}
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
            <Trans>ui.reset</Trans>
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
                <span><Trans>ui.saving</Trans></span>
              </div>
            ) : (
              t("ui.save")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
