import { useMemo } from "react";
import type {
  ConditionalMessage,
  FieldConditionalMessage,
  MessageConditionContext,
} from "@/components/config-form/section-configs/types";

export function useConfigMessages(
  messages: ConditionalMessage[] | undefined,
  fieldMessages: FieldConditionalMessage[] | undefined,
  context: MessageConditionContext | undefined,
): {
  activeMessages: ConditionalMessage[];
  activeFieldMessages: FieldConditionalMessage[];
} {
  const activeMessages = useMemo(() => {
    if (!messages || !context) return [];
    return messages.filter((msg) => msg.condition(context));
  }, [messages, context]);

  const activeFieldMessages = useMemo(() => {
    if (!fieldMessages || !context) return [];
    return fieldMessages.filter((msg) => msg.condition(context));
  }, [fieldMessages, context]);

  return { activeMessages, activeFieldMessages };
}
