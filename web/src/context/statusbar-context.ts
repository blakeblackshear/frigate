import { createContext } from "react";

export type StatusMessage = {
  id: string;
  text: string;
  color?: string;
  link?: string;
};

export type StatusMessagesState = {
  [key: string]: StatusMessage[];
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
