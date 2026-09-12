import type { RendererComponent } from "@/components/config-form/sectionExtras/registry";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export type ConfigSectionData = JsonObject;

export type HiddenFieldContext = {
  fullConfig: FrigateConfig;
  fullCameraConfig?: CameraConfig;
  level: "global" | "camera" | "replay";
  cameraName?: string;
  // Saved form data for the current section/scope (i.e. rawFormData in
  // BaseSection.tsx). Not the user's in-flight RJSF edits. Optional because
  // most hidden-field callsites compute patterns without a specific section
  // value on hand; resolvers fall back to fullCameraConfig / fullConfig.
  formData?: ConfigSectionData;
};

export type HiddenFieldEntry = string | ((ctx: HiddenFieldContext) => string[]);

export type ConfigFormContext = {
  level?: "global" | "camera";
  cameraName?: string;
  globalValue?: JsonValue;
  cameraValue?: JsonValue;
  overrides?: JsonValue;
  hasChanges?: boolean;
  extraHasChanges?: boolean;
  setExtraHasChanges?: (hasChanges: boolean) => void;
  formData?: JsonObject;
  pendingDataBySection?: Record<string, ConfigSectionData>;
  onPendingDataChange?: (
    sectionKey: string,
    cameraName: string | undefined,
    data: ConfigSectionData | null,
  ) => void;
  baselineFormData?: JsonObject;
  hiddenFields?: string[];
  onFormDataChange?: (data: ConfigSectionData) => void;
  fullCameraConfig?: CameraConfig;
  fullConfig?: FrigateConfig;
  i18nNamespace?: string;
  sectionI18nPrefix?: string;
  sectionDocs?: string;
  fieldDocs?: Record<string, string>;
  restartRequired?: string[];
  requiresRestart?: boolean;
  t?: (key: string, options?: Record<string, unknown>) => string;
  renderers?: Record<string, RendererComponent>;
  isProfile?: boolean;
};
