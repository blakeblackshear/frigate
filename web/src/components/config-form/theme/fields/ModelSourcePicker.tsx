import { ReactNode, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import useSWR from "swr";
import axios from "axios";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FrigateConfig } from "@/types/frigateConfig";

export type FrigatePlusModel = {
  id: string;
  name: string;
  baseModel: string;
  trainDate: string;
  isBaseModel: boolean;
  supportedDetectors: string[];
  width: number;
  height: number;
};

const PLUS_PREFIX = "plus://";

/** The Frigate+ model id a path refers to, if it is a Frigate+ path at all. */
function plusModelId(path: unknown): string | undefined {
  return typeof path === "string" && path.startsWith(PLUS_PREFIX)
    ? path.slice(PLUS_PREFIX.length)
    : undefined;
}

type ModelSourcePickerProps = {
  path: unknown;
  // Frigate+ metadata the backend attaches to a saved model, and the only
  // reliable signal that one is active: it resolves `plus://<id>` to a local
  // cache path before serving the config back
  plus?: { id: string } | null;
  // the detector this model runs on, used to filter incompatible Plus models
  detector?: string;
  disabled?: boolean;
  onPathChange: (path: string | undefined) => void;
  // the schema-driven fields for a custom model
  customFields: ReactNode;
};

export function ModelSourcePicker({
  path,
  plus,
  detector,
  disabled,
  onPathChange,
  customFields,
}: ModelSourcePickerProps) {
  const { t } = useTranslation(["views/settings"]);
  const { data: config } = useSWR<FrigateConfig>("config");

  const plusEnabled = Boolean(config?.plus?.enabled);
  // an unsaved pick still carries the plus:// path, which wins over the
  // metadata of whatever model was saved before it
  const selectedId = plusModelId(path) ?? plus?.id;

  const { data: availableModels, isLoading } = useSWR<
    Record<string, FrigatePlusModel>
  >(plusEnabled ? "/plus/models" : null, {
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

  const entries = useMemo(
    () => Object.entries(availableModels ?? {}),
    [availableModels],
  );

  // the tab cannot be derived from the path alone: switching to Frigate+
  // leaves the path untouched until a model is picked
  const [tab, setTab] = useState<"plus" | "custom">(
    selectedId ? "plus" : "custom",
  );

  const handleTabChange = (value: string) => {
    setTab(value as "plus" | "custom");

    // a resolved Frigate+ path is meaningless as a custom path, so drop it
    if (value === "custom" && selectedId) {
      onPathChange(undefined);
    }
  };

  const isCompatible = (model: FrigatePlusModel) =>
    !detector || model.supportedDetectors.includes(detector);

  if (!plusEnabled) {
    return <div className="space-y-6">{customFields}</div>;
  }

  const describe = (model: FrigatePlusModel) =>
    `${new Date(model.trainDate).toLocaleString()} ${model.baseModel} (${
      model.isBaseModel
        ? t("frigatePlus.modelInfo.plusModelType.baseModel")
        : t("frigatePlus.modelInfo.plusModelType.userModel")
    }) ${model.name} (${model.width}x${model.height})`;

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="plus">{t("detectionModels.tabs.plus")}</TabsTrigger>
        <TabsTrigger value="custom">
          {t("detectionModels.tabs.custom")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="plus" className="space-y-1">
        <Label>{t("frigatePlus.modelInfo.availableModels")}</Label>
        <Select
          value={selectedId ?? ""}
          onValueChange={(id) => onPathChange(`${PLUS_PREFIX}${id}`)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full max-w-2xl">
            {selectedId && availableModels?.[selectedId]
              ? describe(availableModels[selectedId])
              : isLoading
                ? t("frigatePlus.modelInfo.loadingAvailableModels")
                : t("detectionModels.plusModel.noModelSelected")}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {entries.length === 0 ? (
                <div className="px-4 py-3 text-center text-sm text-muted-foreground">
                  {t("frigatePlus.modelInfo.noModelsAvailable")}
                </div>
              ) : (
                entries.map(([id, model]) => (
                  <SelectItem
                    key={id}
                    className="cursor-pointer"
                    value={id}
                    disabled={!isCompatible(model)}
                  >
                    <div>{describe(model)}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("frigatePlus.modelInfo.supportedDetectors")}:{" "}
                      {model.supportedDetectors.join(", ")}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectGroup>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          <Trans ns="views/settings">frigatePlus.modelInfo.modelSelect</Trans>
        </p>
      </TabsContent>

      <TabsContent value="custom" className="space-y-6">
        {customFields}
      </TabsContent>
    </Tabs>
  );
}

export default ModelSourcePicker;
