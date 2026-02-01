import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Event } from "@/types/event";
import { isDesktop, isMobile, isSafari } from "react-device-detect";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useTranslation, Trans } from "react-i18next";
import { Button } from "@/components/ui/button";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { FaCheckCircle } from "react-icons/fa";
import { Card, CardContent } from "@/components/ui/card";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import ImageLoadingIndicator from "@/components/indicators/ImageLoadingIndicator";
import { baseUrl } from "@/api/baseUrl";
import { getTranslatedLabel } from "@/utils/i18n";
import useImageLoaded from "@/hooks/use-image-loaded";
import { useIsAdmin } from "@/hooks/use-is-admin";

export type FrigatePlusDialogProps = {
  upload?: Event;
  dialog?: boolean;
  onClose: () => void;
  onEventUploaded: () => void;
};

export function FrigatePlusDialog({
  upload,
  dialog = true,
  onClose,
  onEventUploaded,
}: FrigatePlusDialogProps) {
  const { t, i18n } = useTranslation(["components/dialog"]);

  type SubmissionState = "reviewing" | "uploading" | "submitted";
  const [state, setState] = useState<SubmissionState>(
    upload?.plus_id ? "submitted" : "reviewing",
  );
  useEffect(() => {
    setState(upload?.plus_id ? "submitted" : "reviewing");
  }, [upload?.plus_id]);

  const onSubmitToPlus = useCallback(
    async (falsePositive: boolean) => {
      if (!upload) return;
      falsePositive
        ? axios.put(`events/${upload.id}/false_positive`)
        : axios.post(`events/${upload.id}/plus`, { include_annotation: 1 });
      setState("submitted");
      onEventUploaded();
    },
    [upload, onEventUploaded],
  );

  const [imgRef, imgLoaded, onImgLoad] = useImageLoaded();
  const isAdmin = useIsAdmin();
  const showCard =
    isAdmin &&
    !!upload &&
    upload.data.type === "object" &&
    upload.plus_id !== "not_enabled" &&
    upload.end_time &&
    upload.label !== "on_demand";

  if (!dialog || !upload) return null;

  return (
    <Dialog open={true} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent
        className={cn(
          "scrollbar-container overflow-y-auto",
          isDesktop &&
            "max-h-[95dvh] sm:max-w-xl md:max-w-4xl lg:max-w-4xl xl:max-w-7xl",
          isMobile && "px-4",
        )}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">Submit to Frigate+</DialogTitle>
          <DialogDescription className="sr-only">
            Submit this snapshot to Frigate+
          </DialogDescription>
        </DialogHeader>

        <div className="relative size-full">
          <ImageLoadingIndicator
            className="absolute inset-0 aspect-video min-h-[60dvh] w-full"
            imgLoaded={imgLoaded}
          />
          <div className={imgLoaded ? "visible" : "invisible"}>
            <TransformWrapper minScale={1.0} wheel={{ smoothStep: 0.005 }}>
              <div className="flex flex-col space-y-3">
                <TransformComponent
                  wrapperStyle={{ width: "100%", height: "100%" }}
                  contentStyle={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {upload.id && (
                    <div className="relative mx-auto">
                      <img
                        ref={imgRef}
                        className="mx-auto max-h-[60dvh] rounded-lg bg-black object-contain"
                        src={`${baseUrl}api/events/${upload.id}/snapshot.jpg`}
                        alt={`${upload.label}`}
                        loading={isSafari ? "eager" : "lazy"}
                        onLoad={onImgLoad}
                      />
                    </div>
                  )}
                </TransformComponent>

                {showCard && (
                  <Card className="p-1 text-sm md:p-2">
                    <CardContent className="flex flex-col items-center justify-between gap-3 p-2 md:flex-row">
                      <div className="flex flex-col space-y-3">
                        <div className="text-lg leading-none">
                          {t("explore.plus.submitToPlus.label")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("explore.plus.submitToPlus.desc")}
                        </div>
                      </div>
                      <div className="flex w-full flex-1 flex-col justify-center gap-2 md:ml-8 md:w-auto md:justify-end">
                        {state === "reviewing" && (
                          <>
                            <div>
                              {i18n.language === "en" ? (
                                /^[aeiou]/i.test(upload.label || "") ? (
                                  <Trans
                                    ns="components/dialog"
                                    values={{ label: upload.label }}
                                  >
                                    explore.plus.review.question.ask_an
                                  </Trans>
                                ) : (
                                  <Trans
                                    ns="components/dialog"
                                    values={{ label: upload.label }}
                                  >
                                    explore.plus.review.question.ask_a
                                  </Trans>
                                )
                              ) : (
                                <Trans
                                  ns="components/dialog"
                                  values={{
                                    untranslatedLabel: upload.label,
                                    translatedLabel: getTranslatedLabel(
                                      upload.label,
                                    ),
                                  }}
                                >
                                  explore.plus.review.question.ask_full
                                </Trans>
                              )}
                            </div>
                            <div className="flex w-full flex-row gap-2">
                              <Button
                                className="flex-1 bg-success"
                                aria-label={t("button.yes", { ns: "common" })}
                                onClick={() => {
                                  setState("uploading");
                                  onSubmitToPlus(false);
                                }}
                              >
                                {t("button.yes", { ns: "common" })}
                              </Button>
                              <Button
                                className="flex-1 text-white"
                                aria-label={t("button.no", { ns: "common" })}
                                variant="destructive"
                                onClick={() => {
                                  setState("uploading");
                                  onSubmitToPlus(true);
                                }}
                              >
                                {t("button.no", { ns: "common" })}
                              </Button>
                            </div>
                          </>
                        )}
                        {state === "uploading" && <ActivityIndicator />}
                        {state === "submitted" && (
                          <div className="flex flex-row items-center justify-center gap-2">
                            <FaCheckCircle className="size-4 text-success" />
                            {t("explore.plus.review.state.submitted")}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TransformWrapper>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
