import axios from "axios";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSWR from "swr";
import { useIsAdmin } from "./use-is-admin";
import { GenAIRolesResponse } from "@/types/chat";
import { FrigateConfig } from "@/types/frigateConfig";
import { ReviewSegment } from "@/types/review";

// recordings are the only source used for on demand runs, and their frames
// cost far more tokens than preview frames do
export const MIN_REVIEW_DESCRIPTION_CONTEXT = 32000;

/**
 * Gating and dispatch for re-running a review item through GenAI descriptions.
 */
export function useReviewDescriptions() {
  const { t } = useTranslation(["components/dialog"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const isAdmin = useIsAdmin();

  const { data: genaiRoles } = useSWR<GenAIRolesResponse>(
    isAdmin ? "genai/roles" : null,
    { revalidateOnFocus: false },
  );

  const hasSufficientContext = useMemo(
    () =>
      (genaiRoles?.descriptions?.context_size ?? 0) >=
      MIN_REVIEW_DESCRIPTION_CONTEXT,
    [genaiRoles],
  );

  const canGenerateDescription = useCallback(
    (review: ReviewSegment) =>
      isAdmin &&
      hasSufficientContext &&
      !!review.end_time &&
      !!config?.cameras[review.camera]?.review?.genai?.enabled,
    [config, hasSufficientContext, isAdmin],
  );

  const generateDescription = useCallback(
    (review: ReviewSegment) => {
      axios
        .put(`review/${review.id}/regenerate_description`)
        .then(() => {
          toast.success(t("recording.genaiDescription.toast.success"), {
            position: "top-center",
          });
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message || error.message || "Unknown error";
          toast.error(
            t("recording.genaiDescription.toast.error", {
              error: errorMessage,
            }),
            { position: "top-center" },
          );
        });
    },
    [t],
  );

  return { canGenerateDescription, generateDescription };
}
