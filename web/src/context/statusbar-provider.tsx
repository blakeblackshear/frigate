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
  ) => string;
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
    (key: string, message: string, color?: string, messageId?: string) => {
      const id = messageId || Date.now().toString();
      const msgColor = color || "text-danger";
      setMessagesState((prevMessages) => ({
        ...prevMessages,
        [key]: [
          ...(prevMessages[key] || []),
          { id, text: message, color: msgColor },
        ],
      }));
      return id;
    },
    [],
  );

  const removeMessage = useCallback((key: string, messageId: string) => {
    setMessagesState((prevMessages) => ({
      ...prevMessages,
      [key]: prevMessages[key].filter((msg) => msg.id !== messageId),
    }));
  }, []);

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
