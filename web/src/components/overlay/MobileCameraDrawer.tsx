import { useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";
import { Button } from "../ui/button";
import { FaVideo } from "react-icons/fa";
import { isMobile } from "react-device-detect";

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
  const [cameraDrawer, setCameraDrawer] = useState(false);

  if (!isMobile) {
    return;
  }

  return (
    <Drawer open={cameraDrawer} onOpenChange={setCameraDrawer}>
      <DrawerTrigger asChild>
        <Button className="rounded-lg capitalize" size="sm">
          <FaVideo className="text-secondary-foreground" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="mx-1 max-h-[75dvh] overflow-hidden rounded-t-2xl px-4">
        <div className="flex h-auto w-full flex-col items-center gap-2 overflow-y-auto overflow-x-hidden py-4">
          {allCameras.map((cam) => (
            <div
              key={cam}
              className={`mx-4 w-full py-2 text-center capitalize ${cam == selected ? "rounded-lg bg-secondary" : ""}`}
              onClick={() => {
                onSelectCamera(cam);
                setCameraDrawer(false);
              }}
            >
              {cam.replaceAll("_", " ")}
            </div>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
