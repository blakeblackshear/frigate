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
    toast.success("Copied GPU info to clipboard.");
  };

  if (gpuType == "vainfo") {
    return (
      <Dialog open={showGpuInfo} onOpenChange={setShowGpuInfo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vainfo Output</DialogTitle>
          </DialogHeader>
          {vainfo ? (
            <div className="scrollbar-container mb-2 max-h-96 overflow-y-scroll whitespace-pre-line">
              <div>Return Code: {vainfo.return_code}</div>
              <br />
              <div>Process {vainfo.return_code == 0 ? "Output" : "Error"}:</div>
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
              aria-label="Close GPU info"
              onClick={() => setShowGpuInfo(false)}
            >
              Close
            </Button>
            <Button
              aria-label="Copy GPU info"
              variant="select"
              onClick={() => onCopyInfo()}
            >
              Copy
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
            <DialogTitle>Nvidia SMI Output</DialogTitle>
          </DialogHeader>
          {nvinfo ? (
            <div className="scrollbar-container mb-2 max-h-96 overflow-y-scroll whitespace-pre-line">
              <div>Name: {nvinfo["0"].name}</div>
              <br />
              <div>Driver: {nvinfo["0"].driver}</div>
              <br />
              <div>Cuda Compute Capability: {nvinfo["0"].cuda_compute}</div>
              <br />
              <div>VBios Info: {nvinfo["0"].vbios}</div>
            </div>
          ) : (
            <ActivityIndicator />
          )}
          <DialogFooter>
            <Button
              aria-label="Close GPU info"
              onClick={() => setShowGpuInfo(false)}
            >
              Close
            </Button>
            <Button
              aria-label="Copy GPU info"
              variant="select"
              onClick={() => onCopyInfo()}
            >
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
}
