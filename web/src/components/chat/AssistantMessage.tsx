import ReactMarkdown from "react-markdown";

type AssistantMessageProps = {
  content: string;
};

export function AssistantMessage({ content }: AssistantMessageProps) {
  return <ReactMarkdown>{content}</ReactMarkdown>;
}
