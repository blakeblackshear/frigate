import { useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Button } from "../ui/button";
import { FaFlag } from "react-icons/fa";
import { TimelineType } from "@/types/timeline";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";

type MobileTimelineDrawerProps = {
  selected: TimelineType;
  onSelect: (timeline: TimelineType) => void;
};
export default function MobileTimelineDrawer({
  selected,
  onSelect,
}: MobileTimelineDrawerProps) {
  const { t } = useTranslation(["views/events"]);
  const [drawer, setDrawer] = useState(false);

  if (!isMobile) {
    return;
  }

  return (
    <Drawer open={drawer} onOpenChange={setDrawer}>
      <DrawerTrigger asChild>
        <Button
          className="rounded-lg smart-capitalize"
          aria-label="Select timeline or events list"
          size="sm"
        >
          <FaFlag className="text-secondary-foreground" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="mx-1 flex max-h-[75dvh] flex-col items-center gap-2 overflow-hidden rounded-t-2xl px-4 pb-4">
        <div
          className={`mx-4 w-full py-2 text-center smart-capitalize ${selected == "timeline" ? "rounded-lg bg-secondary" : ""}`}
          onClick={() => {
            onSelect("timeline");
            setDrawer(false);
          }}
        >
          {t("timeline")}
        </div>
        <div
          className={`mx-4 w-full py-2 text-center smart-capitalize ${selected == "events" ? "rounded-lg bg-secondary" : ""}`}
          onClick={() => {
            onSelect("events");
            setDrawer(false);
          }}
        >
          {t("events.label")}
        </div>
        <div
          className={`mx-4 w-full py-2 text-center smart-capitalize ${selected == "detail" ? "rounded-lg bg-secondary" : ""}`}
          onClick={() => {
            onSelect("detail");
            setDrawer(false);
          }}
        >
          {t("detail.label")}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
