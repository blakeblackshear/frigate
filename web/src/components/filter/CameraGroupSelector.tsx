import { CameraGroupConfig, FrigateConfig } from "@/types/frigateConfig";
import { isDesktop, isMobile } from "react-device-detect";
import useSWR from "swr";
import { MdHome } from "react-icons/md";
import { usePersistedOverlayState } from "@/hooks/use-overlay-state";
import { Button } from "../ui/button";
import { useCallback, useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { LuPencil, LuPlus } from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
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
import { usePersistence } from "@/hooks/use-persistence";
import { TooltipPortal } from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import * as LuIcons from "react-icons/lu";
import IconPicker, { IconName, IconRenderer } from "../icons/IconPicker";
import { isValidIconName } from "@/utils/iconUtil";
import {
  MobilePage,
  MobilePageContent,
  MobilePageDescription,
  MobilePageHeader,
  MobilePageTitle,
} from "../mobile/MobilePage";

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

  const [group, setGroup, deleteGroup] = usePersistedOverlayState(
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
        deleteGroup={deleteGroup}
      />
      <Scroller className={`${isMobile ? "whitespace-nowrap" : ""}`}>
        <div
          className={cn(
            "flex items-center justify-start gap-2",
            className,
            isDesktop ? "flex-col" : "whitespace-nowrap",
          )}
        >
          <Tooltip open={tooltip == "default"}>
            <TooltipTrigger asChild>
              <Button
                className={
                  group == "default"
                    ? "bg-blue-900 bg-opacity-60 text-selected focus:bg-blue-900 focus:bg-opacity-60"
                    : "bg-secondary text-secondary-foreground focus:bg-secondary focus:text-secondary-foreground"
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
                        ? "bg-blue-900 bg-opacity-60 text-selected focus:bg-blue-900 focus:bg-opacity-60"
                        : "bg-secondary text-secondary-foreground"
                    }
                    size="xs"
                    onClick={() => setGroup(name, group != "default")}
                    onMouseEnter={() => (isDesktop ? showTooltip(name) : null)}
                    onMouseLeave={() =>
                      isDesktop ? showTooltip(undefined) : null
                    }
                  >
                    {config && config.icon && isValidIconName(config.icon) && (
                      <IconRenderer
                        icon={LuIcons[config.icon]}
                        className="size-4"
                      />
                    )}
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
            className="bg-secondary text-muted-foreground"
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
  deleteGroup: () => void;
};
function NewGroupDialog({
  open,
  setOpen,
  currentGroups,
  activeGroup,
  setGroup,
  deleteGroup,
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

  const [, , , deleteGridLayout] = usePersistence(
    `${activeGroup}-draggable-layout`,
  );

  // callbacks

  const onDeleteGroup = useCallback(
    async (name: string) => {
      deleteGridLayout();
      deleteGroup();

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
    [
      updateConfig,
      activeGroup,
      setGroup,
      setOpen,
      deleteGroup,
      deleteGridLayout,
    ],
  );

  const onSave = () => {
    setOpen(false);
    setEditState("none");
    setEditingGroupName("");
  };

  const onCancel = () => {
    setEditingGroupName("");
    setEditState("none");
  };

  const onEditGroup = useCallback((group: [string, CameraGroupConfig]) => {
    setEditingGroupName(group[0]);
    setEditState("edit");
  }, []);

  const Overlay = isDesktop ? Dialog : MobilePage;
  const Content = isDesktop ? DialogContent : MobilePageContent;
  const Header = isDesktop ? DialogHeader : MobilePageHeader;
  const Description = isDesktop ? DialogDescription : MobilePageDescription;
  const Title = isDesktop ? DialogTitle : MobilePageTitle;

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
          className={cn(
            "scrollbar-container overflow-y-auto",
            isDesktop && "my-4 flex max-h-dvh w-6/12 flex-col",
            isMobile && "px-4",
          )}
        >
          {editState === "none" && (
            <>
              <Header
                className={cn(isDesktop && "mt-5", "justify-center")}
                onClose={() => setOpen(false)}
              >
                <Title>Camera Groups</Title>
                <Description className="sr-only">
                  Edit camera groups
                </Description>
                <div
                  className={cn(
                    "absolute",
                    isDesktop && "right-6 top-10",
                    isMobile && "absolute right-0 top-4",
                  )}
                >
                  <Button
                    size="sm"
                    className={cn(
                      isDesktop &&
                        "size-6 rounded-md bg-secondary-foreground p-1 text-background",
                      isMobile && "text-secondary-foreground",
                    )}
                    onClick={() => {
                      setEditState("add");
                    }}
                  >
                    <LuPlus />
                  </Button>
                </div>
              </Header>
              <div className="flex flex-col gap-4 md:gap-3">
                {currentGroups.map((group) => (
                  <CameraGroupRow
                    key={group[0]}
                    group={group}
                    onDeleteGroup={() => onDeleteGroup(group[0])}
                    onEditGroup={() => onEditGroup(group)}
                  />
                ))}
              </div>
            </>
          )}

          {editState != "none" && (
            <>
              <Header
                className="mt-2"
                onClose={() => {
                  setEditState("none");
                  setEditingGroupName("");
                }}
              >
                <Title>
                  {editState == "add" ? "Add" : "Edit"} Camera Group
                </Title>
                <Description className="sr-only">
                  Edit camera groups
                </Description>
              </Header>
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
        </Content>
      </Overlay>
    </>
  );
}

type EditGroupDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  currentGroups: [string, CameraGroupConfig][];
  activeGroup?: string;
};
export function EditGroupDialog({
  open,
  setOpen,
  currentGroups,
  activeGroup,
}: EditGroupDialogProps) {
  const Overlay = isDesktop ? Dialog : MobilePage;
  const Content = isDesktop ? DialogContent : MobilePageContent;
  const Header = isDesktop ? DialogHeader : MobilePageHeader;
  const Description = isDesktop ? DialogDescription : MobilePageDescription;
  const Title = isDesktop ? DialogTitle : MobilePageTitle;

  // editing group and state

  const editingGroup = useMemo(() => {
    if (currentGroups && activeGroup) {
      return currentGroups.find(([groupName]) => groupName === activeGroup);
    } else {
      return undefined;
    }
  }, [currentGroups, activeGroup]);

  const [isLoading, setIsLoading] = useState(false);

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
          setOpen(open);
        }}
      >
        <Content
          className={cn(
            "min-w-0",
            isDesktop && "max-h-dvh w-6/12 overflow-y-hidden",
          )}
        >
          <div className="scrollbar-container flex flex-col overflow-y-auto md:my-4">
            <Header className="mt-2" onClose={() => setOpen(false)}>
              <Title>Edit Camera Group</Title>
              <Description className="sr-only">Edit camera group</Description>
            </Header>

            <CameraGroupEdit
              currentGroups={currentGroups}
              editingGroup={editingGroup}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              onSave={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
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
        className="transition-background flex flex-row items-center justify-between rounded-lg duration-100 md:p-1"
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
            <DropdownMenu modal={!isDesktop}>
              <DropdownMenuTrigger>
                <HiOutlineDotsVertical className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={onEditGroup}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </>
        )}
        {!isMobile && (
          <div className="flex flex-row items-center gap-2">
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
      )
      .refine(
        (value: string) => {
          return !value.includes(".");
        },
        {
          message: "Camera group name must not contain a period.",
        },
      )
      .refine((value: string) => value.toLowerCase() !== "default", {
        message: "Invalid camera group name.",
      }),

    cameras: z.array(z.string()),
    icon: z
      .string()
      .min(1, { message: "You must select an icon." })
      .refine((value) => Object.keys(LuIcons).includes(value), {
        message: "Invalid icon",
      }),
  });

  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      if (!values) {
        return;
      }

      setIsLoading(true);

      let renamingQuery = "";
      if (editingGroup && editingGroup[0] !== values.name) {
        renamingQuery = `camera_groups.${editingGroup[0]}&`;
      }

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
        .put(
          `config/set?${renamingQuery}${orderQuery}&${iconQuery}${cameraQueries}`,
          {
            requires_restart: 0,
          },
        )
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
    mode: "onSubmit",
    defaultValues: {
      name: (editingGroup && editingGroup[0]) ?? "",
      icon: editingGroup && (editingGroup[1].icon as IconName),
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
                  className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                  placeholder="Enter a name..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator className="my-2 flex bg-secondary" />
        <div className="scrollbar-container max-h-[40dvh] overflow-y-auto">
          <FormField
            control={form.control}
            name="cameras"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cameras</FormLabel>
                <FormDescription>
                  Select cameras for this group.
                </FormDescription>
                <FormMessage />
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
              </FormItem>
            )}
          />
        </div>

        <Separator className="my-2 flex bg-secondary" />
        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem className="flex flex-col space-y-2">
              <FormLabel>Icon</FormLabel>
              <FormControl>
                <IconPicker
                  selectedIcon={{
                    name: field.value,
                    Icon: field.value
                      ? LuIcons[field.value as IconName]
                      : undefined,
                  }}
                  setSelectedIcon={(newIcon) => {
                    field.onChange(newIcon?.name ?? undefined);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator className="my-2 flex bg-secondary" />

        <div className="flex flex-row gap-2 py-5 md:pb-0">
          <Button type="button" className="flex flex-1" onClick={onCancel}>
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
