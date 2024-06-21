import {
  createContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from "react";

export type StatusMessage = {
  id: string;
  text: string;
  color?: string;
  link?: string;
};

export type StatusMessagesState = {
  [key: string]: StatusMessage[];
};

type StatusBarMessagesProviderProps = {
  children: ReactNode;
};

type StatusBarMessagesContextValue = {
  messages: StatusMessagesState;
  addMessage: (
    key: string,
    message: string,
    color?: string,
    messageId?: string,
    link?: string,
  ) => string | undefined;
  removeMessage: (key: string, messageId: string) => void;
  clearMessages: (key: string) => void;
};

export const StatusBarMessagesContext =
  createContext<StatusBarMessagesContextValue | null>(null);

export function StatusBarMessagesProvider({
  children,
}: StatusBarMessagesProviderProps) {
  const [messagesState, setMessagesState] = useState<StatusMessagesState>({});

  const messages = useMemo(() => messagesState, [messagesState]);

  const addMessage = useCallback(
    (
      key: string,
      message: string,
      color?: string,
      messageId?: string,
      link?: string,
    ) => {
      if (!key || !message) return;

      const id = messageId ?? Date.now().toString();
      const msgColor = color ?? "text-danger";

      setMessagesState((prevMessages) => {
        const existingMessages = prevMessages[key] || [];
        // Check if a message with the same ID already exists
        const messageIndex = existingMessages.findIndex((msg) => msg.id === id);

        const newMessage = { id, text: message, color: msgColor, link };

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
    <StatusBarMessagesContext.Provider
      value={{ messages, addMessage, removeMessage, clearMessages }}
    >
      {children}
    </StatusBarMessagesContext.Provider>
  );
}
