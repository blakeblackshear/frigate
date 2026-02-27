import {
  AllGroupsStreamingSettings,
  CameraGroupConfig,
  FrigateConfig,
  GroupStreamingSettings,
} from "@/types/frigateConfig";
import { isDesktop, isMobile } from "react-device-detect";
import useSWR from "swr";
import { MdHome } from "react-icons/md";
import { Button, buttonVariants } from "../ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { HiOutlineDotsVertical, HiTrash } from "react-icons/hi";
import IconWrapper from "../ui/icon-wrapper";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import ActivityIndicator from "../indicators/activity-indicator";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { useUserPersistence } from "@/hooks/use-user-persistence";
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

import { Switch } from "../ui/switch";
import { CameraStreamingDialog } from "../settings/CameraStreamingDialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { useStreamingSettings } from "@/context/streaming-settings-provider";
import { Trans, useTranslation } from "react-i18next";
import { CameraNameLabel } from "../camera/FriendlyNameLabel";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { useHasFullCameraAccess } from "@/hooks/use-has-full-camera-access";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useUserPersistedOverlayState } from "@/hooks/use-overlay-state";

type CameraGroupSelectorProps = {
  className?: string;
};

export function CameraGroupSelector({ className }: CameraGroupSelectorProps) {
  const { t } = useTranslation(["components/camera"]);
  const { data: config } = useSWR<FrigateConfig>("config");
  const allowedCameras = useAllowedCameras();
  const isAdmin = useIsAdmin();

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

  // groups - use user-namespaced key for persistence to avoid cross-user conflicts

  const [group, setGroup, , deleteGroup] = useUserPersistedOverlayState(
    "cameraGroup",
    "default" as string,
  );

  const groups = useMemo(() => {
    if (!config) {
      return [];
    }

    const allGroups = Object.entries(config.camera_groups);

    // If custom role, filter out groups where user has no accessible cameras
    if (!isAdmin) {
      return allGroups
        .filter(([, groupConfig]) => {
          // Check if user has access to at least one camera in this group
          return groupConfig.cameras.some((cameraName) =>
            allowedCameras.includes(cameraName),
          );
        })
        .sort((a, b) => a[1].order - b[1].order);
    }

    return allGroups.sort((a, b) => a[1].order - b[1].order);
  }, [config, allowedCameras, isAdmin]);

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
        isAdmin={isAdmin}
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
                aria-label={t("menu.live.allCameras", { ns: "common" })}
                size="xs"
                onClick={() => (group ? setGroup("default", true) : null)}
                onMouseEnter={() => (isDesktop ? showTooltip("default") : null)}
                onMouseLeave={() => (isDesktop ? showTooltip(undefined) : null)}
              >
                <MdHome className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent className="" side="right">
                {t("menu.live.allCameras", { ns: "common" })}
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
                    aria-label={t("group.label")}
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
                  <TooltipContent className="smart-capitalize" side="right">
                    {name}
                  </TooltipContent>
                </TooltipPortal>
              </Tooltip>
            );
          })}

          {isAdmin && (
            <Button
              className="bg-secondary text-muted-foreground"
              aria-label={t("group.add")}
              size="xs"
              onClick={() => setAddGroup(true)}
            >
              <LuPlus className="size-4 text-primary" />
            </Button>
          )}
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
  isAdmin?: boolean;
};
function NewGroupDialog({
  open,
  setOpen,
  currentGroups,
  activeGroup,
  setGroup,
  deleteGroup,
  isAdmin,
}: NewGroupDialogProps) {
  const { t } = useTranslation(["components/camera"]);
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

  const [, , , deleteGridLayout] = useUserPersistence(
    `${activeGroup}-draggable-layout`,
  );

  useEffect(() => {
    if (!open) {
      setEditState("none");
    }
  }, [open]);

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
            toast.error(
              t("toast.save.error.title", {
                errorMessage: res.statusText,
                ns: "common",
              }),
              {
                position: "top-center",
              },
            );
          }
        })
        .catch((error) => {
          setOpen(false);
          setEditState("none");
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("toast.save.error.title", { errorMessage, ns: "common" }),
            {
              position: "top-center",
            },
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
      t,
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
      <Overlay open={open} onOpenChange={setOpen}>
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
                <Title>{t("group.label")}</Title>
                <Description className="sr-only">{t("group.edit")}</Description>
                {isAdmin && (
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
                      aria-label={t("group.add")}
                      onClick={() => {
                        setEditState("add");
                      }}
                    >
                      <LuPlus />
                    </Button>
                  </div>
                )}
              </Header>
              <div className="flex flex-col gap-4 md:gap-3">
                {currentGroups.map((group) => (
                  <CameraGroupRow
                    key={group[0]}
                    group={group}
                    onDeleteGroup={() => onDeleteGroup(group[0])}
                    onEditGroup={() => onEditGroup(group)}
                    isReadOnly={!isAdmin}
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
                  {editState == "add" ? t("group.add") : t("group.edit")}
                </Title>
                <Description className="sr-only">{t("group.edit")}</Description>
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
  const { t } = useTranslation(["components/camera"]);
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
              <Title>{t("group.edit")}</Title>
              <Description className="sr-only">{t("group.edit")}</Description>
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
  isReadOnly?: boolean;
};

export function CameraGroupRow({
  group,
  onDeleteGroup,
  onEditGroup,
  isReadOnly,
}: CameraGroupRowProps) {
  const { t } = useTranslation(["components/camera"]);
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
              <AlertDialogTitle>
                {t("group.delete.confirm.title")}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              <Trans ns="components/camera" values={{ name: group[0] }}>
                group.delete.confirm.desc
              </Trans>
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("button.cancel", { ns: "common" })}
              </AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={onDeleteGroup}
              >
                {t("button.delete", { ns: "common" })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isMobile && !isReadOnly && (
          <>
            <DropdownMenu modal={!isDesktop}>
              <DropdownMenuTrigger>
                <HiOutlineDotsVertical className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    aria-label={t("group.edit")}
                    onClick={onEditGroup}
                  >
                    {t("button.edit", { ns: "common" })}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    aria-label={t("group.delete.label")}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    {t("button.delete", { ns: "common" })}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </>
        )}
        {!isMobile && !isReadOnly && (
          <div className="flex flex-row items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconWrapper
                  icon={LuPencil}
                  className={`size-[15px] cursor-pointer`}
                  onClick={onEditGroup}
                />
              </TooltipTrigger>
              <TooltipContent>
                {t("button.edit", { ns: "common" })}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconWrapper
                  icon={HiTrash}
                  className={`size-[15px] cursor-pointer`}
                  onClick={() => setDeleteDialogOpen(true)}
                />
              </TooltipTrigger>
              <TooltipContent>
                {t("button.delete", { ns: "common" })}
              </TooltipContent>
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
  const { t } = useTranslation(["components/camera"]);
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");

  const { allGroupsStreamingSettings, setAllGroupsStreamingSettings } =
    useStreamingSettings();

  const [groupStreamingSettings, setGroupStreamingSettings] =
    useState<GroupStreamingSettings>(
      allGroupsStreamingSettings[editingGroup?.[0] ?? ""],
    );

  const allowedCameras = useAllowedCameras();
  const hasFullCameraAccess = useHasFullCameraAccess();

  const [openCamera, setOpenCamera] = useState<string | null>();

  const birdseyeConfig = useMemo(() => config?.birdseye, [config]);

  const formSchema = z.object({
    name: z
      .string()
      .trim()
      .min(2, {
        message: t("group.name.errorMessage.mustLeastCharacters"),
      })
      .transform((val: string) => val.replace(/\s+/g, "_"))
      .refine(
        (value: string) => {
          return (
            editingGroup !== undefined ||
            !currentGroups.map((group) => group[0]).includes(value)
          );
        },
        {
          message: t("group.name.errorMessage.exists"),
        },
      )
      .refine(
        (value: string) => {
          return !value.includes(".");
        },
        {
          message: t("group.name.errorMessage.nameMustNotPeriod"),
        },
      )
      .refine((value: string) => value.toLowerCase() !== "default", {
        message: t("group.name.errorMessage.invalid"),
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

      // update streaming settings
      const updatedSettings: AllGroupsStreamingSettings = {
        ...Object.fromEntries(
          Object.entries(allGroupsStreamingSettings || {}).filter(
            ([key]) => key !== editingGroup?.[0],
          ),
        ),
        [values.name]: groupStreamingSettings,
      };

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
        .then(async (res) => {
          if (res.status === 200) {
            toast.success(
              t("group.success", {
                name: values.name,
              }),
              {
                position: "top-center",
              },
            );
            updateConfig();
            if (onSave) {
              onSave();
            }
            setAllGroupsStreamingSettings(updatedSettings);
          } else {
            toast.error(
              t("toast.save.error.title", {
                errorMessage: res.statusText,
                ns: "common",
              }),
              {
                position: "top-center",
              },
            );
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("toast.save.error.title", {
              errorMessage,
              ns: "common",
            }),
            { position: "top-center" },
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [
      currentGroups,
      setIsLoading,
      onSave,
      updateConfig,
      editingGroup,
      groupStreamingSettings,
      allGroupsStreamingSettings,
      setAllGroupsStreamingSettings,
      t,
    ],
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
              <FormLabel>{t("group.name.label")}</FormLabel>
              <FormControl>
                <Input
                  className="text-md w-full border border-input bg-background p-2 hover:bg-accent hover:text-accent-foreground dark:[color-scheme:dark]"
                  placeholder={t("group.name.placeholder")}
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
                <FormLabel>{t("group.cameras.label")}</FormLabel>
                <FormDescription>{t("group.cameras.desc")}</FormDescription>
                <FormMessage />
                {[
                  ...(birdseyeConfig?.enabled && hasFullCameraAccess
                    ? ["birdseye"]
                    : []),
                  ...Object.keys(config?.cameras ?? {})
                    .filter((camera) => allowedCameras.includes(camera))
                    .sort(
                      (a, b) =>
                        (config?.cameras[a]?.ui?.order ?? 0) -
                        (config?.cameras[b]?.ui?.order ?? 0),
                    ),
                ].map((camera) => (
                  <FormControl key={camera}>
                    <div className="flex items-center justify-between gap-1">
                      <CameraNameLabel
                        className="mx-2 w-full cursor-pointer text-primary smart-capitalize"
                        htmlFor={camera.replaceAll("_", " ")}
                        camera={camera}
                      />

                      <div className="flex items-center gap-x-2">
                        {camera !== "birdseye" && (
                          <Dialog
                            open={openCamera === camera}
                            onOpenChange={(isOpen) =>
                              setOpenCamera(isOpen ? camera : null)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button
                                className="flex h-auto items-center gap-1"
                                aria-label={t("group.camera.setting.label")}
                                size="icon"
                                variant="ghost"
                                disabled={
                                  !(field.value && field.value.includes(camera))
                                }
                              >
                                <LuIcons.LuSettings
                                  className={cn(
                                    field.value && field.value.includes(camera)
                                      ? "text-primary"
                                      : "text-muted-foreground",
                                    "size-5",
                                  )}
                                />
                              </Button>
                            </DialogTrigger>
                            <CameraStreamingDialog
                              camera={camera}
                              groupStreamingSettings={groupStreamingSettings}
                              setGroupStreamingSettings={
                                setGroupStreamingSettings
                              }
                              setIsDialogOpen={(isOpen) =>
                                setOpenCamera(isOpen ? camera : null)
                              }
                            />
                          </Dialog>
                        )}
                        <Switch
                          id={camera.replaceAll("_", " ")}
                          checked={field.value && field.value.includes(camera)}
                          onCheckedChange={(checked) => {
                            const updatedCameras = checked
                              ? [...(field.value || []), camera]
                              : (field.value || []).filter((c) => c !== camera);
                            form.setValue("cameras", updatedCameras);
                          }}
                        />
                      </div>
                    </div>
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
              <FormLabel>{t("group.icon")}</FormLabel>
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
          <Button
            type="button"
            className="flex flex-1"
            aria-label={t("button.cancel", { ns: "common" })}
            onClick={onCancel}
          >
            {t("button.cancel", { ns: "common" })}
          </Button>
          <Button
            variant="select"
            disabled={isLoading}
            className="flex flex-1"
            aria-label={t("button.save", { ns: "common" })}
            type="submit"
          >
            {isLoading ? (
              <div className="flex flex-row items-center gap-2">
                <ActivityIndicator />
                <span>{t("button.saving", { ns: "common" })}</span>
              </div>
            ) : (
              t("button.save", { ns: "common" })
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
