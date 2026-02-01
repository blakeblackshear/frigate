import type { ComponentType } from "react";
import SemanticSearchReindex from "./SemanticSearchReindex.tsx";

export type RendererComponent = ComponentType<
  Record<string, unknown> | undefined
>;

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
export const sectionRenderers: SectionRenderers = {
  semantic_search: {
    SemanticSearchReindex,
  },
};

export default sectionRenderers;
