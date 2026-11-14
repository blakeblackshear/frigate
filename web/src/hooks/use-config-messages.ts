import { useMemo } from "react";
import type {
  ConditionalMessage,
  FieldConditionalMessage,
  MessageConditionContext,
} from "@/components/config-form/section-configs/types";
import { resolveMessageKey } from "@/utils/runtimeOverrides";

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
    return messages
      .filter((msg) => msg.condition(context))
      .map((msg) => ({ ...msg, messageKey: resolveMessageKey(msg, context) }));
  }, [messages, context]);

  const activeFieldMessages = useMemo(() => {
    if (!fieldMessages || !context) return [];
    return fieldMessages
      .filter((msg) => msg.condition(context))
      .map((msg) => ({ ...msg, messageKey: resolveMessageKey(msg, context) }));
  }, [fieldMessages, context]);

  return { activeMessages, activeFieldMessages };
}
