import { ReactNode, useMemo } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  MdVolumeDown,
  MdVolumeMute,
  MdVolumeOff,
  MdVolumeUp,
} from "react-icons/md";
import { VolumeSlider } from "@/components/ui/slider";

type LiveContextMenuProps = {
  camera: string;
  preferredLiveMode: string;
  isRestreamed: boolean;
  supportsAudio: boolean;
  audioState: boolean;
  toggleAudio: () => void;
  volumeState?: number;
  setVolumeState: (volumeState: number) => void;
  muteAll: () => void;
  unmuteAll: () => void;
  resetPreferredLiveMode: () => void;
  children?: ReactNode;
};
export default function LiveContextMenu({
  camera,
  preferredLiveMode,
  isRestreamed,
  supportsAudio,
  audioState,
  toggleAudio,
  volumeState,
  setVolumeState,
  muteAll,
  unmuteAll,
  resetPreferredLiveMode,
  children,
}: LiveContextMenuProps) {
  const VolumeIcon = useMemo(() => {
    if (!volumeState || volumeState == 0.0 || !audioState) {
      return MdVolumeOff;
    } else if (volumeState <= 0.33) {
      return MdVolumeMute;
    } else if (volumeState <= 0.67) {
      return MdVolumeDown;
    } else {
      return MdVolumeUp;
    }
    // only update when specific fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeState, audioState]);

  return (
    <ContextMenu key={camera}>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <div className="text-md py-1 pl-2 capitalize text-primary-variant">
          {camera.replaceAll("_", " ")}
        </div>
        {preferredLiveMode != "jsmpeg" && isRestreamed && supportsAudio && (
          <>
            <ContextMenuSeparator className="mb-1" />
            <div className="p-2 text-sm">
              <div className="flex w-full flex-col gap-1">
                <p>Audio</p>
                <div className="flex flex-row items-center gap-1">
                  <VolumeIcon
                    className="size-5"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      toggleAudio();
                    }}
                  />
                  <VolumeSlider
                    disabled={!audioState}
                    className="my-3 ml-0.5 rounded-lg bg-background/60"
                    value={[volumeState ?? 0]}
                    min={0}
                    max={1}
                    step={0.02}
                    onValueChange={(value) => {
                      setVolumeState(value[0]);
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem>
          <div
            className="flex w-full cursor-pointer items-center justify-start gap-2"
            onClick={muteAll}
          >
            <div className="text-primary">Mute All Cameras</div>
          </div>
        </ContextMenuItem>
        <ContextMenuItem>
          <div
            className="flex w-full cursor-pointer items-center justify-start gap-2"
            onClick={unmuteAll}
          >
            <div className="text-primary">Unmute All Cameras</div>
          </div>
        </ContextMenuItem>
        {isRestreamed && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem>
              <div
                className="flex w-full cursor-pointer items-center justify-start gap-2"
                onClick={() => {}}
              >
                <div className="text-primary">Streaming Settings</div>
              </div>
            </ContextMenuItem>
          </>
        )}
        {preferredLiveMode == "jsmpeg" && isRestreamed && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem>
              <div
                className="flex w-full cursor-pointer items-center justify-start gap-2"
                onClick={resetPreferredLiveMode}
              >
                <div className="text-primary">Reset</div>
              </div>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
