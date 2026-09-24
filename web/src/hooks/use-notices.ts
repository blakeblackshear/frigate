import { useCallback, useEffect, useMemo } from "react";
import axios from "axios";
import useSWR from "swr";
import { useWs } from "@/api/ws";
import type { Notice } from "@/types/notice";

/** When a hidden notice was acknowledged or muted. */
export function hiddenAt(notice: Notice): number {
  return notice.muted_at ?? notice.acknowledged_at ?? 0;
}

/**
 * Active notices come from a REST snapshot, then from every `notices`
 * websocket payload. Hidden notices are fetched only while the hidden list is
 * shown, and again when the active list changes or the tab regains focus.
 */
export function useNotices(showHidden: boolean) {
  const { data: initial, mutate } = useSWR<Notice[]>("notices", {
    revalidateOnFocus: false,
  });
  const { data: all, mutate: mutateHidden } = useSWR<Notice[]>(
    showHidden ? ["notices", { include_hidden: true }] : null,
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

  // once a websocket frame has arrived it is the source of truth; every
  // acknowledge, mute, and unhide publishes a new frame
  const notices = live ?? initial;

  // refetch the hidden list whenever the active list changes; SWR ignores the
  // call while the hidden list is not shown
  useEffect(() => {
    mutateHidden();
  }, [live, mutateHidden]);

  const hidden = useMemo(
    () =>
      all
        ?.filter((notice) => hiddenAt(notice) > 0)
        .sort((a, b) => hiddenAt(b) - hiddenAt(a)),
    [all],
  );

  const act = useCallback(
    async (request: Promise<unknown>) => {
      await request;
      mutate();
    },
    [mutate],
  );

  const acknowledge = useCallback(
    (id: string) => act(axios.post(`notices/${id}/acknowledge`)),
    [act],
  );
  const mute = useCallback(
    (id: string) => act(axios.post(`notices/${id}/mute`)),
    [act],
  );
  const unhide = useCallback(
    (id: string) => act(axios.delete(`notices/${id}/hidden`)),
    [act],
  );

  return { notices, hidden, acknowledge, mute, unhide, mutateHidden };
}
