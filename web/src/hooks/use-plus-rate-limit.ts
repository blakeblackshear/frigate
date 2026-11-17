import axios from "axios";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/use-date-locale";
import { formatSecondsToDuration } from "@/utils/dateUtil";

/**
 * The wait Frigate+ asked for when a request failed because of its rate limit.
 *
 * @returns the seconds to wait, null when rate limited without a known wait,
 * or undefined when the error is not a rate limit
 */
export function getPlusRetryAfter(error: unknown): number | null | undefined {
  if (!axios.isAxiosError(error) || error.response?.status !== 429) {
    return undefined;
  }

  const retryAfter = error.response.data?.retry_after;
  return typeof retryAfter === "number" ? retryAfter : null;
}

/** Messages telling the user Frigate+ is rate limiting requests. */
export function usePlusRateLimit() {
  const { t } = useTranslation(["common"]);
  const dateLocale = useDateLocale();

  const formatRateLimit = useCallback(
    (retryAfter: number | null | undefined) =>
      retryAfter && retryAfter > 0
        ? t("plusRateLimited.retryIn", {
            ns: "common",
            duration: formatSecondsToDuration(retryAfter, dateLocale),
          })
        : t("plusRateLimited.retryLater", { ns: "common" }),
    [t, dateLocale],
  );

  // undefined when the error is not a rate limit, so callers can fall back
  // to their own error message
  const getRateLimitMessage = useCallback(
    (error: unknown) => {
      const retryAfter = getPlusRetryAfter(error);
      return retryAfter === undefined ? undefined : formatRateLimit(retryAfter);
    },
    [formatRateLimit],
  );

  return { formatRateLimit, getRateLimitMessage };
}
