import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export type ConfigSectionData = JsonObject;

export type ConfigFormContext = {
  level?: "global" | "camera";
  cameraName?: string;
  globalValue?: JsonValue;
  cameraValue?: JsonValue;
  fullCameraConfig?: CameraConfig;
  fullConfig?: FrigateConfig;
  i18nNamespace?: string;
  t?: (key: string, options?: Record<string, unknown>) => string;
};
