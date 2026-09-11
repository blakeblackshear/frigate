import { useCallback, useEffect, useMemo } from "react";
import axios from "axios";
import useSWR from "swr";
import { useWs } from "@/api/ws";
import type { Notice } from "@/types/notice";

/**
 * Active notices come from a REST snapshot, then from every `notices`
 * websocket payload. Dismissed notices are fetched only while the history is
 * shown, and again when the active list changes or the tab regains focus. A
 * purge in another tab leaves the active list unchanged, so only focus
 * catches it.
 */
export function useNotices(showDismissed: boolean) {
  const { data: initial, mutate } = useSWR<Notice[]>("notices", {
    revalidateOnFocus: false,
  });
  const { data: history, mutate: mutateHistory } = useSWR<Notice[]>(
    showDismissed ? ["notices", { include_dismissed: true }] : null,
  );
  const {
    value: { payload },
  } = useWs("notices", "");

  const live = useMemo(
    () =>
      payload && typeof payload === "string"
        ? (JSON.parse(payload) as Notice[])
        : undefined,
    [payload],
  );

  // once a websocket frame has arrived it is the source of truth; a dismiss
  // still shows up because the registry publishes a new frame after it
  const notices = live ?? initial;

  // refetch the history whenever the active list changes; SWR ignores the
  // call while the history is hidden
  useEffect(() => {
    mutateHistory();
  }, [live, mutateHistory]);

  const dismissed = useMemo(
    () =>
      history
        ?.filter((notice) => notice.dismissed_at !== null)
        .sort((a, b) => (b.dismissed_at ?? 0) - (a.dismissed_at ?? 0)),
    [history],
  );

  const dismiss = useCallback(
    async (id: string) => {
      await axios.post(`notices/${id}/dismiss`);
      mutate();
    },
    [mutate],
  );

  return { notices, dismissed, dismiss, mutateDismissed: mutateHistory };
}
