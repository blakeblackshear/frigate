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
          toast.error(`Unable to probe camera: ${res.statusText}`, {
            position: "top-center",
          });
        }
      })
      .catch((error) => {
        toast.error(`Unable to probe camera: ${error.response.data.message}`, {
          position: "top-center",
        });
      });
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCopyFfprobe = async () => {
    copy(JSON.stringify(ffprobeInfo));
    toast.success("Copied probe data to clipboard.");
  };

  function gcd(a: number, b: number): number {
    return b === 0 ? a : gcd(b, a % b);
  }

  return (
    <>
      <Toaster position="top-center" />
      <Dialog
        open={showCameraInfoDialog}
        onOpenChange={setShowCameraInfoDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">
              {camera.name.replaceAll("_", " ")} Camera Probe Info
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Stream data is obtained with <code>ffprobe</code>.
          </DialogDescription>

          <div className="mb-2 p-4">
            {ffprobeInfo ? (
              <div>
                {ffprobeInfo.map((stream, idx) => (
                  <div key={idx} className="mb-5">
                    <div className="mb-1 rounded-md bg-secondary p-2 text-lg text-primary">
                      Stream {idx + 1}
                    </div>
                    {stream.return_code == 0 ? (
                      <div>
                        {stream.stdout.streams.map((codec, idx) => (
                          <div className="" key={idx}>
                            {codec.width ? (
                              <div className="text-muted-foreground">
                                <div className="ml-2">Video:</div>
                                <div className="ml-5">
                                  <div>
                                    Codec:
                                    <span className="text-primary">
                                      {" "}
                                      {codec.codec_long_name}
                                    </span>
                                  </div>
                                  <div>
                                    {codec.width && codec.height ? (
                                      <>
                                        Resolution:{" "}
                                        <span className="text-primary">
                                          {" "}
                                          {codec.width}x{codec.height} (
                                          {codec.width /
                                            gcd(codec.width, codec.height)}
                                          /
                                          {codec.height /
                                            gcd(codec.width, codec.height)}{" "}
                                          aspect ratio)
                                        </span>
                                      </>
                                    ) : (
                                      <span>
                                        Resolution:{" "}
                                        <span className="text-primary">
                                          Unknown
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    FPS:{" "}
                                    <span className="text-primary">
                                      {codec.avg_frame_rate == "0/0"
                                        ? "Unknown"
                                        : codec.avg_frame_rate}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">
                                <div className="ml-2 mt-1">Audio:</div>
                                <div className="ml-4">
                                  Codec:{" "}
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
                        <div>Error: {stream.stderr}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ActivityIndicator />
                <div className="mt-2">Fetching Camera Data</div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="select" onClick={() => onCopyFfprobe()}>
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
