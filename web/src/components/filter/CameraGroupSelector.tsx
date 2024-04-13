import {
  CameraGroupConfig,
  FrigateConfig,
  GROUP_ICONS,
} from "@/types/frigateConfig";
import { isDesktop } from "react-device-detect";
import useSWR from "swr";
import { MdHome } from "react-icons/md";
import { usePersistedOverlayState } from "@/hooks/use-overlay-state";
import { Button } from "../ui/button";
import { useCallback, useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { getIconForGroup } from "@/utils/iconUtil";
import { LuPencil, LuPlus, LuTrash } from "react-icons/lu";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import FilterCheckBox from "./FilterCheckBox";
import axios from "axios";

type CameraGroupSelectorProps = {
  className?: string;
};
export function CameraGroupSelector({ className }: CameraGroupSelectorProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  // tooltip

  const [tooltip, setTooltip] = useState<string>();
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();
  const showTooltip = useCallback(
    (newTooltip: string | undefined) => {
      if (!newTooltip) {
        setTooltip(newTooltip);

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      } else {
        setTimeoutId(setTimeout(() => setTooltip(newTooltip), 500));
      }
    },
    [timeoutId],
  );

  // groups

  const [group, setGroup] = usePersistedOverlayState(
    "cameraGroup",
    "default" as string,
  );

  const groups = useMemo(() => {
    if (!config) {
      return [];
    }

    return Object.entries(config.camera_groups).sort(
      (a, b) => a[1].order - b[1].order,
    );
  }, [config]);

  // add group

  const [addGroup, setAddGroup] = useState(false);

  return (
    <div
      className={`flex items-center justify-start gap-2 ${className ?? ""} ${isDesktop ? "flex-col" : ""}`}
    >
      <NewGroupDialog
        open={addGroup}
        setOpen={setAddGroup}
        currentGroups={groups}
      />

      <Tooltip open={tooltip == "default"}>
        <TooltipTrigger asChild>
          <Button
            className={
              group == "default"
                ? "text-selected bg-blue-900 focus:bg-blue-900 bg-opacity-60 focus:bg-opacity-60"
                : "text-secondary-foreground bg-secondary focus:text-secondary-foreground focus:bg-secondary"
            }
            size="xs"
            onClick={() => (group ? setGroup("default", true) : null)}
            onMouseEnter={() => (isDesktop ? showTooltip("default") : null)}
            onMouseLeave={() => (isDesktop ? showTooltip(undefined) : null)}
          >
            <MdHome className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="capitalize" side="right">
          All Cameras
        </TooltipContent>
      </Tooltip>
      {groups.map(([name, config]) => {
        return (
          <Tooltip key={name} open={tooltip == name}>
            <TooltipTrigger asChild>
              <Button
                className={
                  group == name
                    ? "text-selected bg-blue-900 focus:bg-blue-900 bg-opacity-60 focus:bg-opacity-60"
                    : "text-secondary-foreground bg-secondary"
                }
                size="xs"
                onClick={() => setGroup(name, group != "default")}
                onMouseEnter={() => (isDesktop ? showTooltip(name) : null)}
                onMouseLeave={() => (isDesktop ? showTooltip(undefined) : null)}
              >
                {getIconForGroup(config.icon)}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="capitalize" side="right">
              {name}
            </TooltipContent>
          </Tooltip>
        );
      })}
      {isDesktop && (
        <Button
          className="text-muted-foreground bg-secondary"
          size="xs"
          onClick={() => setAddGroup(true)}
        >
          <LuPlus className="size-4 text-primary" />
        </Button>
      )}
    </div>
  );
}

type NewGroupDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  currentGroups: [string, CameraGroupConfig][];
};
function NewGroupDialog({ open, setOpen, currentGroups }: NewGroupDialogProps) {
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const birdseyeConfig = useMemo(() => config?.birdseye, [config]);

  // add fields

  const [editState, setEditState] = useState<"none" | "add" | "edit">("none");
  const [newTitle, setNewTitle] = useState("");
  const [icon, setIcon] = useState("");
  const [cameras, setCameras] = useState<string[]>([]);

  // validation

  const [error, setError] = useState("");

  const onCreateGroup = useCallback(async () => {
    if (!newTitle) {
      setError("A title must be selected");
      return;
    }

    if (!icon) {
      setError("An icon must be selected");
      return;
    }

    if (!cameras || cameras.length < 2) {
      setError("At least 2 cameras must be selected");
      return;
    }

    setError("");
    const orderQuery = `camera_groups.${newTitle}.order=${currentGroups.length}`;
    const iconQuery = `camera_groups.${newTitle}.icon=${icon}`;
    const cameraQueries = cameras
      .map((cam) => `&camera_groups.${newTitle}.cameras=${cam}`)
      .join("");

    const req = axios.put(
      `config/set?${orderQuery}&${iconQuery}${cameraQueries}`,
      { requires_restart: 0 },
    );

    setOpen(false);

    if ((await req).status == 200) {
      setNewTitle("");
      setIcon("");
      setCameras([]);
      updateConfig();
    }
  }, [currentGroups, cameras, newTitle, icon, setOpen, updateConfig]);

  const onDeleteGroup = useCallback(
    async (name: string) => {
      const req = axios.put(`config/set?camera_groups.${name}`, {
        requires_restart: 0,
      });

      if ((await req).status == 200) {
        updateConfig();
      }
    },
    [updateConfig],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        setEditState("none");
        setNewTitle("");
        setIcon("");
        setCameras([]);
        setOpen(open);
      }}
    >
      <DialogContent className="min-w-0 w-96">
        <DialogTitle>Camera Groups</DialogTitle>
        {currentGroups.map((group) => (
          <div key={group[0]} className="flex justify-between items-center">
            {group[0]}
            <div className="flex justify-center gap-1">
              <Button
                className="bg-transparent"
                size="icon"
                onClick={() => {
                  setNewTitle(group[0]);
                  setIcon(group[1].icon);
                  setCameras(group[1].cameras);
                  setEditState("edit");
                }}
              >
                <LuPencil />
              </Button>
              <Button
                className="text-destructive bg-transparent"
                size="icon"
                onClick={() => onDeleteGroup(group[0])}
              >
                <LuTrash />
              </Button>
            </div>
          </div>
        ))}
        {currentGroups.length > 0 && <DropdownMenuSeparator />}
        {editState == "none" && (
          <Button
            className="text-primary justify-start"
            variant="ghost"
            onClick={() => setEditState("add")}
          >
            <LuPlus className="size-4 mr-1" />
            Create new group
          </Button>
        )}
        {editState != "none" && (
          <>
            <Input
              type="text"
              placeholder="Name"
              disabled={editState == "edit"}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex justify-start gap-2 items-center cursor-pointer">
                  {icon.length == 0 ? "Select Icon" : "Icon: "}
                  {icon ? getIconForGroup(icon) : <div className="size-4" />}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={icon} onValueChange={setIcon}>
                  {GROUP_ICONS.map((gIcon) => (
                    <DropdownMenuRadioItem
                      key={gIcon}
                      className="w-full flex justify-start items-center gap-2 cursor-pointer hover:bg-secondary"
                      value={gIcon}
                    >
                      {getIconForGroup(gIcon)}
                      {gIcon}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex justify-start gap-2 items-center cursor-pointer">
                  {cameras.length == 0
                    ? "Select Cameras"
                    : `${cameras.length} Cameras`}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {[
                  ...(birdseyeConfig?.enabled ? ["birdseye"] : []),
                  ...Object.keys(config?.cameras ?? {}),
                ].map((camera) => (
                  <FilterCheckBox
                    key={camera}
                    isChecked={cameras.includes(camera)}
                    label={camera.replaceAll("_", " ")}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setCameras([...cameras, camera]);
                      } else {
                        const index = cameras.indexOf(camera);
                        setCameras([
                          ...cameras.slice(0, index),
                          ...cameras.slice(index + 1),
                        ]);
                      }
                    }}
                  />
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {error && <div className="text-danger">{error}</div>}
            <Button variant="select" onClick={onCreateGroup}>
              Submit
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
