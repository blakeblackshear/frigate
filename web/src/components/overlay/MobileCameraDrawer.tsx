import { useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Button } from "../ui/button";
import { FaVideo } from "react-icons/fa";
import { isMobile } from "react-device-detect";
import { useTranslation } from "react-i18next";
import { CameraNameLabel } from "../camera/FriendlyNameLabel";

type MobileCameraDrawerProps = {
  allCameras: string[];
  selected: string;
  onSelectCamera: (cam: string) => void;
};
export default function MobileCameraDrawer({
  allCameras,
  selected,
  onSelectCamera,
}: MobileCameraDrawerProps) {
  const { t } = useTranslation(["common"]);
  const [cameraDrawer, setCameraDrawer] = useState(false);

  if (!isMobile) {
    return;
  }

  return (
    <Drawer open={cameraDrawer} onOpenChange={setCameraDrawer}>
      <DrawerTrigger asChild>
        <Button
          className="rounded-lg smart-capitalize"
          aria-label={t("menu.live.cameras.title")}
          size="sm"
        >
          <FaVideo className="text-secondary-foreground" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="mx-1 max-h-[75dvh] overflow-hidden rounded-t-2xl px-4">
        <div className="scrollbar-container flex h-auto w-full flex-col items-center gap-2 overflow-y-auto overflow-x-hidden py-4">
          {allCameras.map((cam) => (
            <div
              key={cam}
              className={`mx-4 w-full py-2 text-center smart-capitalize ${cam == selected ? "rounded-lg bg-secondary" : ""}`}
              onClick={() => {
                onSelectCamera(cam);
                setCameraDrawer(false);
              }}
            >
              <CameraNameLabel camera={cam} />
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
