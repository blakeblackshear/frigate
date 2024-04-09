import useSWR from "swr";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import ActivityIndicator from "../indicators/activity-indicator";
import { Vainfo } from "@/types/stats";
import { Button } from "../ui/button";
import copy from "copy-to-clipboard";

type VainfoDialogProps = {
  showVainfo: boolean;
  setShowVainfo: (show: boolean) => void;
};
export default function VainfoDialog({
  showVainfo,
  setShowVainfo,
}: VainfoDialogProps) {
  const { data: vainfo } = useSWR<Vainfo>(showVainfo ? "vainfo" : null);

  const onCopyVainfo = async () => {
    copy(JSON.stringify(vainfo).replace(/[\\\s]+/gi, ""));
    setShowVainfo(false);
  };

  return (
    <Dialog open={showVainfo} onOpenChange={setShowVainfo}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vainfo Output</DialogTitle>
        </DialogHeader>
        {vainfo ? (
          <div className="mb-2 max-h-96 whitespace-pre-line overflow-y-scroll">
            <div>Return Code: {vainfo.return_code}</div>
            <br />
            <div>Process {vainfo.return_code == 0 ? "Output" : "Error"}:</div>
            <br />
            <div>{vainfo.return_code == 0 ? vainfo.stdout : vainfo.stderr}</div>
          </div>
        ) : (
          <ActivityIndicator />
        )}
        <DialogFooter>
          <Button onClick={() => setShowVainfo(false)}>Close</Button>
          <Button variant="select" onClick={() => onCopyVainfo()}>
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
