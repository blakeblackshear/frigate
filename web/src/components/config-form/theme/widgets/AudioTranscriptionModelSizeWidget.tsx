// audio_transcription.model_size. See GenAIBackedModelSizeWidget for the shared
// implementation, including the clear-vs-default handling.
import type { WidgetProps } from "@rjsf/utils";
import { GenAIBackedModelSizeWidget } from "./GenAIBackedModelSizeWidget";

export function AudioTranscriptionModelSizeWidget(props: WidgetProps) {
  return (
    <GenAIBackedModelSizeWidget
      {...props}
      options={{
        ...props.options,
        builtInModels: ["whisper"],
        i18nPrefix: "audioTranscriptionModelSize",
      }}
    />
  );
}
