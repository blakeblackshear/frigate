import { useState, ReactNode, useCallback, useMemo } from "react";
import {
  StatusBarMessagesContext,
  StatusMessagesState,
} from "@/context/statusbar-context";
import { ProblemSeverity } from "@/types/stats";

type StatusBarMessagesProviderProps = {
  children: ReactNode;
};

export function StatusBarMessagesProvider({
  children,
}: StatusBarMessagesProviderProps) {
  const [messagesState, setMessagesState] = useState<StatusMessagesState>({});

  const messages = useMemo(() => messagesState, [messagesState]);

  const addMessage = useCallback(
    (
      key: string,
      message: string,
      severity: ProblemSeverity = "error",
      messageId?: string,
      link?: string,
    ) => {
      if (!key || !message) return;

      // the text is the fallback id, so repeating a message replaces it
      const id = messageId ?? message;

      setMessagesState((prevMessages) => {
        const existingMessages = prevMessages[key] || [];
        // Check if a message with the same ID already exists
        const messageIndex = existingMessages.findIndex((msg) => msg.id === id);

        const newMessage = { id, text: message, severity, link };

        // If the message exists, replace it, otherwise add the new message
        let updatedMessages;
        if (messageIndex > -1) {
          updatedMessages = [
            ...existingMessages.slice(0, messageIndex),
            newMessage,
            ...existingMessages.slice(messageIndex + 1),
          ];
        } else {
          updatedMessages = [...existingMessages, newMessage];
        }

        return {
          ...prevMessages,
          [key]: updatedMessages,
        };
      });

      return id;
    },
    [],
  );

  const removeMessage = useCallback(
    (key: string, messageId: string) => {
      if (!messages || !key || !messages[key]) return;
      setMessagesState((prevMessages) => ({
        ...prevMessages,
        [key]: prevMessages[key].filter((msg) => msg.id !== messageId),
      }));
    },
    [messages],
  );

  const clearMessages = useCallback((key: string) => {
    setMessagesState((prevMessages) => {
      const updatedMessages = { ...prevMessages };
      delete updatedMessages[key];
      return updatedMessages;
    });
  }, []);

  return (
    <StatusBarMessagesContext
      value={{ messages, addMessage, removeMessage, clearMessages }}
    >
      {children}
    </StatusBarMessagesContext>
  );
}
