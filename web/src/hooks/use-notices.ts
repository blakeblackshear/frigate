import { useCallback, useMemo } from "react";
import axios from "axios";
import useSWR from "swr";
import { useWs } from "@/api/ws";
import type { Notice, NoticeStats } from "@/types/notice";

/**
 * Active notices: a REST snapshot, replaced by every `notices` websocket
 * payload after that. Stats are fetched separately and only change on
 * dismiss or a new occurrence, so they revalidate after each dismiss.
 */
export function useNotices() {
  const { data: initial, mutate } = useSWR<Notice[]>("notices", {
    revalidateOnFocus: false,
  });
  const { data: stats, mutate: mutateStats } = useSWR<NoticeStats[]>(
    "notices/stats",
    { revalidateOnFocus: false },
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

  const statsByKind = useMemo(() => {
    const byKind: Partial<Record<Notice["kind"], NoticeStats>> = {};
    (stats ?? []).forEach((entry) => {
      byKind[entry.kind] = entry;
    });
    return byKind;
  }, [stats]);

  const dismiss = useCallback(
    async (id: string) => {
      await axios.post(`notices/${id}/dismiss`);
      mutate();
      mutateStats();
    },
    [mutate, mutateStats],
  );

  return { notices, statsByKind, dismiss };
}
