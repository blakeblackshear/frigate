import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import ActivityIndicator from "../indicators/activity-indicator";
import { Ffprobe } from "@/types/stats";
import { Button } from "../ui/button";
import copy from "copy-to-clipboard";
import { CameraConfig } from "@/types/frigateConfig";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Toaster } from "../ui/sonner";
import { Trans, useTranslation } from "react-i18next";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";

type CameraInfoDialogProps = {
  camera: CameraConfig;
  showCameraInfoDialog: boolean;
  setShowCameraInfoDialog: React.Dispatch<React.SetStateAction<boolean>>;
};
export default function CameraInfoDialog({
  camera,
  showCameraInfoDialog,
  setShowCameraInfoDialog,
}: CameraInfoDialogProps) {
  const { t } = useTranslation(["views/system"]);
  const [ffprobeInfo, setFfprobeInfo] = useState<Ffprobe[]>();

  useEffect(() => {
    axios
      .get("ffprobe", {
        params: {
          paths: `camera:${camera.name}`,
        },
      })
      .then((res) => {
        if (res.status === 200) {
          setFfprobeInfo(res.data);
        } else {
          toast.error(
            t("cameras.toast.success.copyToClipboard", {
              errorMessage: res.statusText,
            }),
            {
              position: "top-center",
            },
          );
        }
      })
      .catch((error) => {
        toast.error(
          t("cameras.toast.success.copyToClipboard", {
            errorMessage: error.response.data.message,
          }),
          {
            position: "top-center",
          },
        );
      });
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCopyFfprobe = async () => {
    copy(JSON.stringify(ffprobeInfo));
    toast.success(t("cameras.toast.success.copyToClipboard"));
  };

  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }

  const cameraName = useCameraFriendlyName(camera);

  return (
    <>
      <Toaster position="top-center" />
      <Dialog
        open={showCameraInfoDialog}
        onOpenChange={setShowCameraInfoDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="smart-capitalize">
              {t("cameras.info.cameraProbeInfo", {
                camera: cameraName,
              })}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <Trans ns="views/system">cameras.info.streamDataFromFFPROBE</Trans>
          </DialogDescription>

          <div className="mb-2 p-4">
            {ffprobeInfo ? (
              <div>
                {ffprobeInfo.map((stream, idx) => (
                  <div key={idx} className="mb-5">
                    <div className="mb-1 rounded-md bg-secondary p-2 text-lg text-primary">
                      {t("cameras.info.stream", {
                        idx: idx + 1,
                      })}
                    </div>
                    {stream.return_code == 0 ? (
                      <div>
                        {stream.stdout.streams.map((codec, idx) => (
                          <div className="" key={idx}>
                            {codec.width ? (
                              <div className="text-muted-foreground">
                                <div className="ml-2">
                                  {t("cameras.info.video")}
                                </div>
                                <div className="ml-5">
                                  <div>
                                    {t("cameras.info.codec")}
                                    <span className="text-primary">
                                      {" "}
                                      {codec.codec_long_name}
                                    </span>
                                  </div>
                                  <div>
                                    {codec.width && codec.height ? (
                                      <>
                                        {t("cameras.info.resolution")}{" "}
                                        <span className="text-primary">
                                          {" "}
                                          {codec.width}x{codec.height} (
                                          {codec.width /
                                            gcd(codec.width, codec.height)}
                                          /
                                          {codec.height /
                                            gcd(codec.width, codec.height)}{" "}
                                          {t("cameras.info.aspectRatio")})
                                        </span>
                                      </>
                                    ) : (
                                      <span>
                                        {t("cameras.info.resolution")}{" "}
                                        <span className="text-primary">
                                          t("cameras.info.unknown")
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    {t("cameras.info.fps")}{" "}
                                    <span className="text-primary">
                                      {codec.avg_frame_rate == "0/0"
                                        ? t("cameras.info.unknown")
                                        : codec.avg_frame_rate}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">
                                <div className="ml-2 mt-1">Audio:</div>
                                <div className="ml-4">
                                  {t("cameras.info.codec")}{" "}
                                  <span className="text-primary">
                                    {codec.codec_long_name}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-2">
                        <div>
                          {t("cameras.info.error", {
                            error: stream.stderr,
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ActivityIndicator />
                <div className="mt-2">{t("cameras.info.fetching")}</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="select"
              aria-label={t("button.copy", { ns: "common" })}
              onClick={() => onCopyFfprobe()}
            >
              {t("button.copy", { ns: "common" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
