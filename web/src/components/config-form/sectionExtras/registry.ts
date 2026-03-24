import type { ComponentType } from "react";
import SemanticSearchReindex from "./SemanticSearchReindex.tsx";
import CameraReviewStatusToggles from "./CameraReviewStatusToggles";
import ProxyRoleMap from "./ProxyRoleMap";
import NotificationsSettingsExtras from "./NotificationsSettingsExtras";
import type { ConfigFormContext } from "@/types/configForm";

// Props that will be injected into all section renderers
export type SectionRendererProps = {
  selectedCamera?: string;
  setUnsavedChanges?: (hasChanges: boolean) => void;
  formContext?: ConfigFormContext;
  [key: string]: unknown; // Allow additional props from uiSchema
};

export type RendererComponent = ComponentType<SectionRendererProps>;

export type SectionRenderers = Record<
  string,
  Record<string, RendererComponent>
>;

// Section renderers registry
// Used to register custom renderer components for specific config sections.
// Maps a section key (e.g., `semantic_search`) to a mapping of renderer
// names to React components. These names are referenced from `uiSchema`
// descriptors (e.g., `{ "ui:after": { render: "SemanticSearchReindex" } }`) and
// are resolved by `FieldTemplate` through `formContext.renderers`.
//
// RUNTIME PROPS INJECTION:
// All renderers automatically receive the following props from BaseSection:
// - selectedCamera?: string - The current camera name (camera-level only)
// - setUnsavedChanges?: (hasChanges: boolean) => void - Callback to signal unsaved state
//
// Additional static props can be passed via uiSchema:
// { "ui:after": { render: "MyRenderer", props: { customProp: "value" } } }
//
// ADDING NEW RENDERERS:
// 1. Create your component accepting SectionRendererProps
// 2. Import and add it to the appropriate section in this registry
// 3. Reference it in your section's uiSchema using the { render: "ComponentName" } syntax
export const sectionRenderers: SectionRenderers = {
  semantic_search: {
    SemanticSearchReindex,
  },
  review: {
    CameraReviewStatusToggles,
  },
  proxy: {
    ProxyRoleMap,
  },
  notifications: {
    NotificationsSettingsExtras,
  },
};

export default sectionRenderers;
