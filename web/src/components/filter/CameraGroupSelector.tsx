import {
  CameraGroupConfig,
  FrigateConfig,
  GROUP_ICONS,
} from "@/types/frigateConfig";
import { isDesktop, isMobile } from "react-device-detect";
import useSWR from "swr";
import { MdHome } from "react-icons/md";
import { usePersistedOverlayState } from "@/hooks/use-overlay-state";
import { Button } from "../ui/button";
import { useCallback, useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { getIconForGroup } from "@/utils/iconUtil";
import { LuPencil, LuPlus } from "react-icons/lu";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Drawer, DrawerContent } from "../ui/drawer";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import axios from "axios";
import FilterSwitch from "./FilterSwitch";
import { HiOutlineDotsVertical, HiTrash } from "react-icons/hi";
import IconWrapper from "../ui/icon-wrapper";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import ActivityIndicator from "../indicators/activity-indicator";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { TooltipPortal } from "@radix-ui/react-tooltip";

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

  const Scroller = isMobile ? ScrollArea : "div";

  return (
    <>
      <NewGroupDialog
        open={addGroup}
        setOpen={setAddGroup}
        currentGroups={groups}
        activeGroup={group}
        setGroup={setGroup}
      />
      <Scroller className={`${isMobile ? "whitespace-nowrap" : ""}`}>
        <div
          className={`flex items-center justify-start gap-2 ${className ?? ""} ${isDesktop ? "flex-col" : "whitespace-nowrap"}`}
        >
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
            <TooltipPortal>
              <TooltipContent className="capitalize" side="right">
                All Cameras
              </TooltipContent>
            </TooltipPortal>
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
                    onMouseLeave={() =>
                      isDesktop ? showTooltip(undefined) : null
                    }
                  >
                    {getIconForGroup(config.icon)}
                  </Button>
                </TooltipTrigger>
                <TooltipPortal>
                  <TooltipContent className="capitalize" side="right">
                    {name}
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            );
          })}

          <Button
            className="text-muted-foreground bg-secondary"
            size="xs"
            onClick={() => setAddGroup(true)}
          >
            <LuPlus className="size-4 text-primary" />
          </Button>
          {isMobile && <ScrollBar orientation="horizontal" className="h-0" />}
        </div>
      </Scroller>
    </>
  );
}

type NewGroupDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  currentGroups: [string, CameraGroupConfig][];
  activeGroup?: string;
  setGroup: (value: string | undefined, replace?: boolean | undefined) => void;
};
function NewGroupDialog({
  open,
  setOpen,
  currentGroups,
  activeGroup,
  setGroup,
}: NewGroupDialogProps) {
  const { mutate: updateConfig } = useSWR<FrigateConfig>("config");

  // editing group and state

  const [editingGroupName, setEditingGroupName] = useState("");

  const editingGroup = useMemo(() => {
    if (currentGroups && editingGroupName !== undefined) {
      return currentGroups.find(
        ([groupName]) => groupName === editingGroupName,
      );
    } else {
      return undefined;
    }
  }, [currentGroups, editingGroupName]);

  const [editState, setEditState] = useState<"none" | "add" | "edit">("none");
  const [isLoading, setIsLoading] = useState(false);

  // callbacks

  const onDeleteGroup = useCallback(
    async (name: string) => {
      // TODO: reset order on groups when deleting

      await axios
        .put(`config/set?camera_groups.${name}`, { requires_restart: 0 })
        .then((res) => {
          if (res.status === 200) {
            if (activeGroup == name) {
              // deleting current group
              setGroup("default");
            }
            updateConfig();
          } else {
            setOpen(false);
            setEditState("none");
            toast.error(`Failed to save config changes: ${res.statusText}`, {
              position: "top-center",
            });
          }
        })
        .catch((error) => {
          setOpen(false);
          setEditState("none");
          toast.error(
            `Failed to save config changes: ${error.response.data.message}`,
            { position: "top-center" },
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [updateConfig, activeGroup, setGroup, setOpen],
  );

  const onSave = () => {
    setOpen(false);
    setEditState("none");
  };

  const onCancel = () => {
    setEditingGroupName("");
    setEditState("none");
  };

  const onEditGroup = useCallback((group: [string, CameraGroupConfig]) => {
    setEditingGroupName(group[0]);
    setEditState("edit");
  }, []);

  const Overlay = isDesktop ? Dialog : Drawer;
  const Content = isDesktop ? DialogContent : DrawerContent;

  return (
    <>
      <Toaster
        className="toaster group z-[100]"
        position="top-center"
        closeButton={true}
      />
      <Overlay
        open={open}
        onOpenChange={(open) => {
          setEditState("none");
          setOpen(open);
        }}
      >
        <Content
          className={`min-w-0 ${isMobile ? "w-full p-3 rounded-t-2xl max-h-[90%]" : "w-6/12 max-h-dvh overflow-y-hidden"}`}
        >
          <div className="flex flex-col my-4 overflow-y-auto">
            {editState === "none" && (
              <>
                <div className="flex flex-row justify-between items-center py-2">
                  <DialogTitle>Camera Groups</DialogTitle>
                  <Button
                    variant="secondary"
                    className="size-6 p-1 rounded-md text-background bg-secondary-foreground"
                    onClick={() => {
                      setEditState("add");
                    }}
                  >
                    <LuPlus />
                  </Button>
                </div>
                {currentGroups.map((group) => (
                  <CameraGroupRow
                    key={group[0]}
                    group={group}
                    onDeleteGroup={() => onDeleteGroup(group[0])}
                    onEditGroup={() => onEditGroup(group)}
                  />
                ))}
              </>
            )}

            {editState != "none" && (
              <>
                <div className="flex flex-row justify-between items-center mb-3">
                  <DialogTitle>
                    {editState == "add" ? "Add" : "Edit"} Camera Group
                  </DialogTitle>
                </div>
                <CameraGroupEdit
                  currentGroups={currentGroups}
                  editingGroup={editingGroup}
                  isLoading={isLoading}
                  setIsLoading={setIsLoading}
                  onSave={onSave}
                  onCancel={onCancel}
                />
              </>
            )}
          </div>
        </Content>
      </Overlay>
    </>
  );
}

type CameraGroupRowProps = {
  group: [string, CameraGroupConfig];
  onDeleteGroup: () => void;
  onEditGroup: () => void;
};

export function CameraGroupRow({
  group,
  onDeleteGroup,
  onEditGroup,
}: CameraGroupRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!group) {
    return;
  }

  return (
    <>
      <div
        key={group[0]}
        className="flex md:p-1 rounded-lg flex-row items-center justify-between md:mx-2 my-1.5 transition-background duration-100"
      >
        <div className={`flex items-center`}>
          <p className="cursor-default">{group[0]}</p>
        </div>
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              Are you sure you want to delete the camera group{" "}
              <em>{group[0]}</em>?
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDeleteGroup}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isMobile && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <HiOutlineDotsVertical className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={onEditGroup}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        {!isMobile && (
          <div className="flex flex-row gap-2 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconWrapper
                  icon={LuPencil}
                  className={`size-[15px] cursor-pointer`}
                  onClick={onEditGroup}
                />
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconWrapper
                  icon={HiTrash}
                  className={`size-[15px] cursor-pointer`}
                  onClick={() => setDeleteDialogOpen(true)}
                />
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </>
  );
}

type CameraGroupEditProps = {
  currentGroups: [string, CameraGroupConfig][];
  editingGroup?: [string, CameraGroupConfig];
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onSave?: () => void;
  onCancel?: () => void;
};

export function CameraGroupEdit({
  currentGroups,
  editingGroup,
  isLoading,
  setIsLoading,
  onSave,
  onCancel,
}: CameraGroupEditProps) {
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const birdseyeConfig = useMemo(() => config?.birdseye, [config]);

  const formSchema = z.object({
    name: z
      .string()
      .min(2, {
        message: "Camera group name must be at least 2 characters.",
      })
      .transform((val: string) => val.trim().replace(/\s+/g, "_"))
      .refine(
        (value: string) => {
          return (
            editingGroup !== undefined ||
            !currentGroups.map((group) => group[0]).includes(value)
          );
        },
        {
          message: "Camera group name already exists.",
        },
      ),
    cameras: z.array(z.string()).min(2, {
      message: "You must select at least two cameras.",
    }),
    icon: z.string(),
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      if (!values) {
        return;
      }

      setIsLoading(true);

      const order =
        editingGroup === undefined
          ? currentGroups.length + 1
          : editingGroup[1].order;

      const orderQuery = `camera_groups.${values.name}.order=${+order}`;
      const iconQuery = `camera_groups.${values.name}.icon=${values.icon}`;
      const cameraQueries = values.cameras
        .map((cam) => `&camera_groups.${values.name}.cameras=${cam}`)
        .join("");

      axios
        .put(`config/set?${orderQuery}&${iconQuery}${cameraQueries}`, {
          requires_restart: 0,
        })
        .then((res) => {
          if (res.status === 200) {
            toast.success(`Camera group (${values.name}) has been saved.`, {
              position: "top-center",
            });
            updateConfig();
            if (onSave) {
              onSave();
            }
          } else {
            toast.error(`Failed to save config changes: ${res.statusText}`, {
              position: "top-center",
            });
          }
        })
        .catch((error) => {
          toast.error(
            `Failed to save config changes: ${error.response.data.message}`,
            { position: "top-center" },
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [currentGroups, setIsLoading, onSave, updateConfig, editingGroup],
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      name: (editingGroup && editingGroup[0]) ?? "",
      icon: editingGroup && editingGroup[1].icon,
      cameras: editingGroup && editingGroup[1].cameras,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-2 space-y-6 overflow-y-hidden"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  className="w-full p-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                  placeholder="Enter a name..."
                  disabled={editingGroup !== undefined}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator className="flex my-2 bg-secondary" />
        <div className="max-h-[25dvh] md:max-h-[40dvh] overflow-y-auto">
          <FormField
            control={form.control}
            name="cameras"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cameras</FormLabel>
                <FormDescription>
                  Select cameras for this group.
                </FormDescription>
                {[
                  ...(birdseyeConfig?.enabled ? ["birdseye"] : []),
                  ...Object.keys(config?.cameras ?? {}),
                ].map((camera) => (
                  <FormControl key={camera}>
                    <FilterSwitch
                      isChecked={field.value && field.value.includes(camera)}
                      label={camera.replaceAll("_", " ")}
                      onCheckedChange={(checked) => {
                        const updatedCameras = checked
                          ? [...(field.value || []), camera]
                          : (field.value || []).filter((c) => c !== camera);
                        form.setValue("cameras", updatedCameras);
                      }}
                    />
                  </FormControl>
                ))}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator className="flex my-2 bg-secondary" />
        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Icon</FormLabel>
              <FormControl>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an icon" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GROUP_ICONS.map((gIcon) => (
                      <SelectItem key={gIcon} value={gIcon}>
                        <div className="flex flex-row justify-start items-center gap-2">
                          <div className="size-4">{getIconForGroup(gIcon)}</div>
                          {gIcon}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator className="flex my-2 bg-secondary" />

        <div className="flex flex-row gap-2 pt-5">
          <Button className="flex flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="select"
            disabled={isLoading}
            className="flex flex-1"
            type="submit"
          >
            {isLoading ? (
              <div className="flex flex-row items-center gap-2">
                <ActivityIndicator />
                <span>Saving...</span>
              </div>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
