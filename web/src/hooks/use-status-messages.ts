import { useEmbeddingsReindexProgress } from "@/api/ws";
import {
  StatusBarMessagesContext,
  StatusMessage,
} from "@/context/statusbar-context";
import useStats, { useAutoFrigateStats } from "@/hooks/use-stats";
import { ProblemSeverity } from "@/types/stats";
import { useContext, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

const SEVERITY_ORDER: Record<ProblemSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

/**
 * Publishes the stats problems and reindex progress to the status bar, then
 * returns every status bar message, most severe first.
 */
export default function useStatusMessages(): StatusMessage[] {
  const { t } = useTranslation(["views/system"]);
  const { messages, addMessage, clearMessages } = useContext(
    StatusBarMessagesContext,
  )!;

  const stats = useAutoFrigateStats();
  const { potentialProblems } = useStats(stats);

  useEffect(() => {
    clearMessages("stats");
    potentialProblems.forEach((problem) => {
      addMessage(
        "stats",
        problem.text,
        problem.severity,
        undefined,
        problem.relevantLink,
      );
    });
  }, [potentialProblems, addMessage, clearMessages]);

  const { payload: reindexState } = useEmbeddingsReindexProgress();

  useEffect(() => {
    if (reindexState) {
      if (reindexState.status == "indexing") {
        clearMessages("embeddings-reindex");
        addMessage(
          "embeddings-reindex",
          t("stats.reindexingEmbeddings", {
            processed: Math.floor(
              (reindexState.processed_objects / reindexState.total_objects) *
                100,
            ),
          }),
        );
      }
      if (reindexState.status === "completed") {
        clearMessages("embeddings-reindex");
      }
    }
  }, [reindexState, addMessage, clearMessages, t]);

  return useMemo(
    () =>
      Object.values(messages)
        .flat()
        .sort(
          (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
        ),
    [messages],
  );
}
