// semantic_search.model_size. See GenAIBackedModelSizeWidget for the shared
// implementation, including the clear-vs-default handling.
import type { WidgetProps } from "@rjsf/utils";
import { GenAIBackedModelSizeWidget } from "./GenAIBackedModelSizeWidget";

export function SemanticSearchModelSizeWidget(props: WidgetProps) {
  return (
    <GenAIBackedModelSizeWidget
      {...props}
      options={{
        ...props.options,
        builtInModels: ["jinav1", "jinav2"],
        i18nPrefix: "semanticSearchModelSize",
      }}
    />
  );
}
