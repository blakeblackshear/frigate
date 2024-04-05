import { LogLine } from "@/types/log";
import { isDesktop } from "react-device-detect";
import { Sheet, SheetContent } from "../ui/sheet";
import { Drawer, DrawerContent } from "../ui/drawer";
import { LogChip } from "../indicators/Chip";

type LogInfoDialogProps = {
  logLine?: LogLine;
  setLogLine: (log: LogLine | undefined) => void;
};
export default function LogInfoDialog({
  logLine,
  setLogLine,
}: LogInfoDialogProps) {
  const Overlay = isDesktop ? Sheet : Drawer;
  const Content = isDesktop ? SheetContent : DrawerContent;

  return (
    <Overlay
      open={logLine != undefined}
      onOpenChange={(open) => {
        if (!open) {
          setLogLine(undefined);
        }
      }}
    >
      <Content className={isDesktop ? "" : "max-h-[75dvh] p-2 overflow-hidden"}>
        {logLine && (
          <div className="size-full flex flex-col gap-5">
            <div className="w-min flex flex-col gap-1.5">
              <div className="text-sm text-primary-foreground/40">Type</div>
              <LogChip severity={logLine.severity} />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-sm text-primary-foreground/40">
                Timestamp
              </div>
              <div className="text-sm">{logLine.dateStamp}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-sm text-primary-foreground/40">Tag</div>
              <div className="text-sm">{logLine.section}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-sm text-primary-foreground/40">Message</div>
              <div className="text-sm">{logLine.content}</div>
            </div>
          </div>
        )}
      </Content>
    </Overlay>
  );
}
