import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import MotionTuner from "@/components/settings/MotionTuner";
import MasksAndZones from "@/components/settings/MasksAndZones";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import useOptimisticState from "@/hooks/use-optimistic-state";
import Logo from "@/components/Logo";
import { isMobile } from "react-device-detect";
import { FaVideo } from "react-icons/fa";
import { CameraConfig, FrigateConfig } from "@/types/frigateConfig";
import useSWR from "swr";
import General from "@/components/settings/General";
import FilterCheckBox from "@/components/filter/FilterCheckBox";
import { ZoneMaskFilterButton } from "@/components/filter/ZoneMaskFilter";
import { PolygonType } from "@/types/canvas";

export default function Settings() {
  const settingsViews = [
    "general",
    "objects",
    "masks / zones",
    "motion tuner",
  ] as const;

  type SettingsType = (typeof settingsViews)[number];
  const [page, setPage] = useState<SettingsType>("general");
  const [pageToggle, setPageToggle] = useOptimisticState(page, setPage, 100);

  const { data: config } = useSWR<FrigateConfig>("config");

  const [isEditing, setIsEditing] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const cameras = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.values(config.cameras)
      .filter((conf) => conf.ui.dashboard && conf.enabled)
      .sort((aConf, bConf) => aConf.ui.order - bConf.ui.order);
  }, [config]);

  const [selectedCamera, setSelectedCamera] = useState<string>();

  const [filterZoneMask, setFilterZoneMask] = useState<PolygonType[]>();

  useEffect(() => {
    if (cameras) {
      setSelectedCamera(cameras[0].name);
    }
  }, [cameras]);

  return (
    <div className="size-full p-2 flex flex-col">
      <div className="w-full h-11 relative flex justify-between items-center">
        {isMobile && (
          <Logo className="absolute inset-x-1/2 -translate-x-1/2 h-8" />
        )}
        <ToggleGroup
          className="*:px-3 *:py-4 *:rounded-md"
          type="single"
          size="sm"
          value={pageToggle}
          onValueChange={(value: SettingsType) => {
            if (value) {
              setPageToggle(value);
            }
          }}
        >
          {Object.values(settingsViews).map((item) => (
            <ToggleGroupItem
              key={item}
              className={`flex items-center justify-between gap-2 ${pageToggle == item ? "" : "*:text-gray-500"}`}
              value={item}
              aria-label={`Select ${item}`}
            >
              <div className="capitalize">{item}</div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {(page == "objects" ||
          page == "masks / zones" ||
          page == "motion tuner") && (
          <div className="flex items-center gap-2">
            {page == "masks / zones" && (
              <ZoneMaskFilterButton
                selectedZoneMask={filterZoneMask}
                updateZoneMaskFilter={setFilterZoneMask}
              />
            )}
            {/* {isEditing && page == "masks / zones" && (<PolygonEditControls /)} */}
            <CameraSelectButton
              allCameras={cameras}
              selectedCamera={selectedCamera}
              setSelectedCamera={setSelectedCamera}
            />
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-col items-start w-full h-full md:h-dvh pb-9 md:pb-24">
        {page == "general" && <General />}
        {page == "objects" && <></>}
        {page == "masks / zones" && (
          <MasksAndZones
            selectedCamera={selectedCamera}
            selectedZoneMask={filterZoneMask}
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            unsavedChanges={unsavedChanges}
            setUnsavedChanges={setUnsavedChanges}
          />
        )}
        {page == "motion tuner" && (
          <MotionTuner selectedCamera={selectedCamera} />
        )}
      </div>
    </div>
  );
}

type CameraSelectButtonProps = {
  allCameras: CameraConfig[];
  selectedCamera: string;
  setSelectedCamera: React.Dispatch<React.SetStateAction<string>>;
};

function CameraSelectButton({
  allCameras,
  selectedCamera,
  setSelectedCamera,
}: CameraSelectButtonProps) {
  const [open, setOpen] = useState(false);

  if (!allCameras) {
    return;
  }

  const trigger = (
    <Button
      className="flex items-center gap-2 capitalize bg-selected hover:bg-selected"
      size="sm"
    >
      <FaVideo className="text-background dark:text-primary" />
      <div className="hidden md:block text-background dark:text-primary">
        {selectedCamera == undefined ? "No Camera" : selectedCamera}
      </div>
    </Button>
  );
  const content = (
    <>
      {isMobile && (
        <>
          <DropdownMenuLabel className="flex justify-center">
            Camera
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
        </>
      )}
      <div className="h-auto overflow-y-auto overflow-x-hidden pb-4 md:pb-0">
        {allCameras.map((item) => (
          <FilterCheckBox
            key={item.name}
            isChecked={item.name === selectedCamera}
            label={item.name}
            onCheckedChange={(isChecked) => {
              if (isChecked) {
                setSelectedCamera(item.name);
                setOpen(false);
              }
            }}
          />
        ))}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setSelectedCamera(selectedCamera);
          }

          setOpen(open);
        }}
      >
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[75dvh] overflow-hidden">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(open: boolean) => {
        if (!open) {
          setSelectedCamera(selectedCamera);
        }

        setOpen(open);
      }}
    >
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent>{content}</DropdownMenuContent>
    </DropdownMenu>
  );
}
