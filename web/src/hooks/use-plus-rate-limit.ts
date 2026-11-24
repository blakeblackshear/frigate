import axios from "axios";
import { formatDuration, Locale } from "date-fns";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/use-date-locale";

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

/**
 * A wait in seconds as a readable duration, such as "1 day, 1 hour".
 *
 * Waits can last days, so the days are kept rather than folded away or
 * turned into calendar months.
 */
export function formatPlusWait(seconds: number, locale?: Locale): string {
  const total = Math.ceil(seconds);

  return formatDuration(
    {
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60,
    },
    { delimiter: ", ", locale },
  );
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
            duration: formatPlusWait(retryAfter, dateLocale),
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
