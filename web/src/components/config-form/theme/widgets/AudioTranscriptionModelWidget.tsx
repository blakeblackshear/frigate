// audio_transcription.model: the built-in whisper backend plus GenAI providers
// with the transcribe role. See GenAIBackedModelWidget for the shared
// implementation.
import type { WidgetProps } from "@rjsf/utils";
import { GenAIBackedModelWidget } from "./GenAIBackedModelWidget";

export function AudioTranscriptionModelWidget(props: WidgetProps) {
  return (
    <GenAIBackedModelWidget
      {...props}
      options={{
        ...props.options,
        role: "transcribe",
        i18nPrefix: "audioTranscriptionModel",
      }}
    />
  );
}
