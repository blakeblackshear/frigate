// semantic_search.model: built-in Jina models plus GenAI providers with the
// embeddings role. See GenAIBackedModelWidget for the shared implementation.
import type { WidgetProps } from "@rjsf/utils";
import { GenAIBackedModelWidget } from "./GenAIBackedModelWidget";

export function SemanticSearchModelWidget(props: WidgetProps) {
  return (
    <GenAIBackedModelWidget
      {...props}
      options={{
        ...props.options,
        role: "embeddings",
        i18nPrefix: "semanticSearchModel",
      }}
    />
  );
}
