import { useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Button } from "../ui/button";
import { FaFlag } from "react-icons/fa";
import { TimelineType } from "@/types/timeline";
import { isMobile } from "react-device-detect";

type MobileTimelineDrawerProps = {
  selected: TimelineType;
  onSelect: (timeline: TimelineType) => void;
};
export default function MobileTimelineDrawer({
  selected,
  onSelect,
}: MobileTimelineDrawerProps) {
  const [drawer, setDrawer] = useState(false);

  if (!isMobile) {
    return;
  }

  return (
    <Drawer open={drawer} onOpenChange={setDrawer}>
      <DrawerTrigger asChild>
        <Button className="rounded-lg capitalize" size="sm" variant="secondary">
          <FaFlag className="text-muted-foreground" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[75dvh] overflow-hidden flex flex-col items-center gap-2 px-4 pb-4 mx-1 rounded-t-2xl">
        <div
          className={`w-full mx-4 py-2 text-center capitalize ${selected == "timeline" ? "bg-secondary rounded-lg" : ""}`}
          onClick={() => {
            onSelect("timeline");
            setDrawer(false);
          }}
        >
          Timeline
        </div>
        <div
          className={`w-full mx-4 py-2 text-center capitalize ${selected == "events" ? "bg-secondary rounded-lg" : ""}`}
          onClick={() => {
            onSelect("events");
            setDrawer(false);
          }}
        >
          Events
        </div>
      </DrawerContent>
    </Drawer>
  );
}
