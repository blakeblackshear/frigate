import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import ActivityIndicator from "../indicators/activity-indicator";
import { GpuInfo, Nvinfo, Vainfo } from "@/types/stats";
import { Button } from "../ui/button";
import copy from "copy-to-clipboard";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type GPUInfoDialogProps = {
  showGpuInfo: boolean;
  gpuType: GpuInfo;
  setShowGpuInfo: (show: boolean) => void;
};
export default function GPUInfoDialog({
  showGpuInfo,
  gpuType,
  setShowGpuInfo,
}: GPUInfoDialogProps) {
  const { t } = useTranslation(["views/system"]);

  const { data: vainfo } = useSWR<Vainfo>(
    showGpuInfo && gpuType == "vainfo" ? "vainfo" : null,
  );
  const { data: nvinfo } = useSWR<Nvinfo>(
    showGpuInfo && gpuType == "nvinfo" ? "nvinfo" : null,
  );

  const onCopyInfo = async () => {
    copy(
      JSON.stringify(gpuType == "vainfo" ? vainfo : nvinfo)
        .replace(/\\t/g, "\t")
        .replace(/\\n/g, "\n"),
    );
    toast.success(t("general.hardwareInfo.gpuInfo.toast.success"));
  };

  if (gpuType == "vainfo") {
    return (
      <Dialog open={showGpuInfo} onOpenChange={setShowGpuInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("general.hardwareInfo.gpuInfo.vainfoOutput.title")}
            </DialogTitle>
          </DialogHeader>
          {vainfo ? (
            <div className="scrollbar-container mb-2 max-h-96 overflow-y-scroll whitespace-pre-line">
              <div>
                {t("general.hardwareInfo.gpuInfo.vainfoOutput.returnCode", {
                  code: vainfo.return_code,
                })}
              </div>
              <br />
              <div>
                {vainfo.return_code == 0
                  ? t("general.hardwareInfo.gpuInfo.vainfoOutput.processOutput")
                  : t("general.hardwareInfo.gpuInfo.vainfoOutput.processError")}
              </div>
              <br />
              <div>
                {vainfo.return_code == 0 ? vainfo.stdout : vainfo.stderr}
              </div>
            </div>
          ) : (
            <ActivityIndicator />
          )}
          <DialogFooter>
            <Button
              aria-label={t("general.hardwareInfo.gpuInfo.closeInfo.label")}
              onClick={() => setShowGpuInfo(false)}
            >
              {t("button.close", { ns: "common" })}
            </Button>
            <Button
              aria-label={t("general.hardwareInfo.gpuInfo.copyInfo.label")}
              variant="select"
              onClick={() => onCopyInfo()}
            >
              {t("button.copy", { ns: "common" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  } else {
    return (
      <Dialog open={showGpuInfo} onOpenChange={setShowGpuInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("general.hardwareInfo.gpuInfo.nvidiaSMIOutput.title")}
            </DialogTitle>
          </DialogHeader>
          {nvinfo ? (
            <div className="scrollbar-container mb-2 max-h-96 overflow-y-scroll whitespace-pre-line">
              <div>
                {t("general.hardwareInfo.gpuInfo.nvidiaSMIOutput.name", {
                  name: nvinfo["0"].name,
                })}
              </div>
              <br />
              <div>
                {t("general.hardwareInfo.gpuInfo.nvidiaSMIOutput.name", {
                  name: nvinfo["0"].driver,
                })}
              </div>
              <br />
              <div>
                {t("general.hardwareInfo.gpuInfo.nvidiaSMIOutput.name", {
                  name: nvinfo["0"].cuda_compute,
                })}
              </div>
              <br />
              <div>
                {t("general.hardwareInfo.gpuInfo.nvidiaSMIOutput.name", {
                  name: nvinfo["0"].vbios,
                })}
              </div>
            </div>
          ) : (
            <ActivityIndicator />
          )}
          <DialogFooter>
            <Button
              aria-label={t("general.hardwareInfo.gpuInfo.closeInfo.label")}
              onClick={() => setShowGpuInfo(false)}
            >
              {t("button.close", { ns: "common" })}
            </Button>
            <Button
              aria-label={t("general.hardwareInfo.gpuInfo.copyInfo.label")}
              variant="select"
              onClick={() => onCopyInfo()}
            >
              {t("button.copy", { ns: "common" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
