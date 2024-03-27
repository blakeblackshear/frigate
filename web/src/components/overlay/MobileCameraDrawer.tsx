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
        <Button className="rounded-lg capitalize" size="sm" variant="secondary">
          <FaVideo className="text-muted-foreground" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[75dvh] overflow-y-auto flex flex-col items-center gap-2 px-4 pb-4 mx-1 rounded-t-2xl">
        {allCameras.map((cam) => (
          <div
            key={cam}
            className={`w-full mx-4 py-2 text-center capitalize ${cam == selected ? "bg-secondary rounded-lg" : ""}`}
            onClick={() => {
              onSelectCamera(cam);
              setCameraDrawer(false);
            }}
          >
            {cam.replaceAll("_", " ")}
          </div>
        ))}
      </DrawerContent>
    </Drawer>
  );
}
