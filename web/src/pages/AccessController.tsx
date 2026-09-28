import axios from "axios";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSWR from "swr";
import { useAllowedCameras } from "@/hooks/use-allowed-cameras";
import { baseUrl } from "@/api/baseUrl";
import { Button } from "@/components/ui/button";
import { GenericVideoPlayer } from "@/components/player/GenericVideoPlayer";
import { FrigateConfig } from "@/types/frigateConfig";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LuDoorOpen,
  LuEye,
  LuLock,
  LuLockOpen,
  LuPencil,
  LuPlay,
  LuPlus,
  LuRotateCcw,
  LuTrash2,
} from "react-icons/lu";

type AccessControllerRecord = {
  id: string;
  name: string;
  ip_address: string;
  port: number;
  provider: "cgi" | "netsdk";
  sdk_port: number;
  use_https: boolean;
  event_api: "eventManager" | "snapManager";
  type: string;
  model: string;
  serial_number: string;
  status: string;
  last_checked_at?: number | null;
  seconds_before: number;
  seconds_after: number;
  associated_camera?: string | null;
  username?: string;
  password?: string;
};

type EventRecord = {
  id: string;
  device_id?: string;
  device_name?: string;
  time?: string;
  Time?: string;
  timestamp?: number | string;
  Code?: string;
  code?: string;
  action?: string;
  data?: Record<string, unknown> | string | null;
  card_number?: string | null;
  owner_names?: string[];
  verification_status?: "pending" | "unverified" | "valid" | "warning" | "unknown";
  people?: { event_id: string; name: string; start_time: number; end_time: number | null }[];
  camera?: string | null;
  clip_start?: number;
  clip_end?: number;
  [key: string]: unknown;
};

type DeviceFormValues = {
  id: string;
  name: string;
  username: string;
  password: string;
  ipAddress: string;
  port: number;
  sdkPort: number;
  provider: "cgi" | "netsdk";
  useHttps: boolean;
  eventApi: "eventManager" | "snapManager";
  associatedCamera: string;
  secondsBefore: number;
  secondsAfter: number;
  clearCredentials: boolean;
};

type AccessDoor = {
  id: string;
  name: string;
  status: string;
  online: boolean | null;
};

type ControllerPreview = {
  available: boolean;
  source?: "controller_snapshot" | "frigate_camera";
  image_url?: string;
  snapshot_url?: string;
  provider_diagnostic?: Record<string, unknown>;
};

type DeviceEditorState = {
  mode: "create" | "edit";
  device: AccessControllerRecord | null;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string; detail?: string } | undefined)
        ?.message ??
      (error.response?.data as { message?: string; detail?: string } | undefined)
        ?.detail ??
      error.message ??
      fallback
    );
  }

  return fallback;
}

function getLiveStatus(device: AccessControllerRecord) {
  if (!device.last_checked_at || Date.now() / 1000 - device.last_checked_at > 30) {
    return "unknown";
  }
  return device.status?.toLowerCase() || "unknown";
}

export default function AccessControllerPage() {
  const { t } = useTranslation(["common", "views/organization"]);
  const [activeTab, setActiveTab] = useState<"controllers" | "events">("controllers");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all");
  const [deviceEditor, setDeviceEditor] = useState<DeviceEditorState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [footageEvent, setFootageEvent] = useState<EventRecord | null>(null);
  const [retrying, setRetrying] = useState<string[]>([]);
  const [connectingAll, setConnectingAll] = useState(false);
  const [controllerDetail, setControllerDetail] = useState<AccessControllerRecord | null>(null);

  useEffect(() => {
    document.title = t("documentTitle", { ns: "views/organization" });
  }, [t]);

  const {
    data: controllers,
    mutate: refreshControllers,
    error: controllersError,
  } = useSWR<AccessControllerRecord[]>("access-controllers", {
    revalidateOnFocus: false,
    refreshInterval: 5000,
  });

  const eventKey = useMemo(
    () =>
      selectedDeviceId === "all"
        ? "access-controllers/events"
        : `access-controllers/events?device_id=${encodeURIComponent(selectedDeviceId)}`,
    [selectedDeviceId],
  );

  const {
    data: events,
    mutate: refreshEvents,
    error: eventsError,
  } = useSWR<EventRecord[]>(eventKey, {
    revalidateOnFocus: false,
    refreshInterval: 5000,
  });

  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });
  const allowedCameras = useAllowedCameras();

  const cameraOptions = useMemo(() => {
    const cameraNames = allowedCameras.length > 0 ? allowedCameras : Object.keys(config?.cameras ?? {});

    return cameraNames
      .map((cameraName) => ({
        value: cameraName,
        label: config?.cameras?.[cameraName]?.friendly_name ?? cameraName,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allowedCameras, config?.cameras]);

  useEffect(() => {
    if (controllersError) {
      toast.error(
        getErrorMessage(
          controllersError,
          t("toast.error.loadDevicesFailed", { ns: "views/organization" }),
        ),
        { position: "top-center" },
      );
    }
  }, [controllersError, t]);

  useEffect(() => {
    if (eventsError) {
      toast.error(
        getErrorMessage(
          eventsError,
          t("toast.error.loadEventsFailed", { ns: "views/organization" }),
        ),
        { position: "top-center" },
      );
    }
  }, [eventsError, t]);

  const deviceList = controllers ?? [];
  const eventList = events ?? [];

  const handleSave = async (values: DeviceFormValues, mode: "create" | "edit") => {
    const payload = {
      id: values.id,
      name: values.name,
      ip_address: values.ipAddress,
      port: values.port,
      provider: values.provider,
      sdk_port: values.sdkPort,
      use_https: values.useHttps,
      event_api: values.eventApi,
      associated_camera: values.associatedCamera || null,
      seconds_before: values.secondsBefore,
      seconds_after: values.secondsAfter,
      ...(mode === "create" || values.username ? { username: values.username } : {}),
      ...(mode === "create" || values.password ? { password: values.password } : {}),
      ...(mode === "edit" && values.clearCredentials ? { clear_credentials: true } : {}),
    };

    try {
      if (mode === "create") {
        await axios.post("access-controllers", payload);
        toast.success(t("toast.success.created", { ns: "views/organization" }), {
          position: "top-center",
        });
      } else {
        await axios.put(`access-controllers/${values.id}`, payload);
        toast.success(t("toast.success.updated", { ns: "views/organization" }), {
          position: "top-center",
        });
      }

      await Promise.all([refreshControllers(), refreshEvents()]);
      setDeviceEditor(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error, t("toast.error.saveFailed", { ns: "views/organization" })),
        { position: "top-center" },
      );
      throw error;
    }
  };

  const handleRetry = async (deviceId: string) => {
    setRetrying((current) => [...current, deviceId]);
    try {
      const { data } = await axios.post<AccessControllerRecord>(`access-controllers/${deviceId}/refresh`);
      if (data.status === "online") {
        toast.success(t("toast.success.connected", { ns: "views/organization" }), { position: "top-center" });
      } else {
        toast.error(
          t(data.status === "error" ? "toast.error.connectionError" : "toast.error.connectionFailed", { ns: "views/organization" }),
          { position: "top-center" },
        );
      }
      await refreshControllers();
    } catch (error) {
      toast.error(
        getErrorMessage(error, t("toast.error.refreshFailed", { ns: "views/organization" })),
        { position: "top-center" },
      );
    } finally {
      setRetrying((current) => current.filter((id) => id !== deviceId));
    }
  };

  const handleConnectAll = async () => {
    setConnectingAll(true);
    try {
      const { data } = await axios.post<AccessControllerRecord[]>("access-controllers/refresh-all");
      const online = data.filter((device) => device.status === "online").length;
      const message = t("toast.connectionSummary", {
        ns: "views/organization",
        online,
        total: data.length,
      });
      if (online === data.length) {
        toast.success(message, { position: "top-center" });
      } else {
        toast.error(message, { position: "top-center" });
      }
      await Promise.all([refreshControllers(), refreshEvents()]);
    } catch (error) {
      toast.error(
        getErrorMessage(error, t("toast.error.refreshFailed", { ns: "views/organization" })),
        { position: "top-center" },
      );
    } finally {
      setConnectingAll(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      await axios.delete(`access-controllers/${deleteTarget.id}`);
      toast.success(t("toast.success.deleted", { ns: "views/organization" }), {
        position: "top-center",
      });
      await refreshControllers();
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        getErrorMessage(error, t("toast.error.deleteFailed", { ns: "views/organization" })),
        { position: "top-center" },
      );
    }
  };

  const statusClasses: Record<string, string> = {
    online: "bg-emerald-500/10 text-emerald-500",
    offline: "bg-red-500/10 text-red-500",
    error: "bg-amber-500/10 text-amber-500",
    unknown: "bg-slate-500/10 text-slate-300",
  };
  const verificationClasses: Record<string, string> = {
    valid: "text-emerald-500",
    warning: "text-amber-500",
    unknown: "text-slate-400",
    pending: "text-blue-400",
    unverified: "text-muted-foreground",
  };

  return (
    <div className="size-full overflow-hidden p-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-foreground">
            {t("title", { ns: "views/organization" })}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("subtitle", { ns: "views/organization" })}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "controllers" | "events")}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="controllers">
              {t("tabs.controllers", { ns: "views/organization" })}
            </TabsTrigger>
            <TabsTrigger value="events">
              {t("tabs.events", { ns: "views/organization" })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controllers" className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleConnectAll} disabled={connectingAll || deviceList.length === 0}>
                <LuRotateCcw className="mr-2 size-4" />
                {t("button.connectAll", { ns: "views/organization" })}
              </Button>
              <Button
                onClick={() =>
                  setDeviceEditor({
                    mode: "create",
                    device: null,
                  })
                }
              >
                <LuPlus className="mr-2 size-4" />
                {t("button.addController", { ns: "views/organization" })}
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("controllers.table.id", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("controllers.table.name", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("controllers.table.ipAddress", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("controllers.table.port", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("controllers.table.type", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("controllers.table.model", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("controllers.table.serial", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("controllers.table.status", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("controllers.table.lastChecked", { ns: "views/organization" })}</TableHead>
                    <TableHead className="text-right">
                      {t("controllers.table.actions", { ns: "views/organization" })}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviceList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                        {t("controllers.empty", { ns: "views/organization" })}
                      </TableCell>
                    </TableRow>
                  ) : (
                    deviceList.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>{device.id}</TableCell>
                        <TableCell>{device.name || device.id}</TableCell>
                        <TableCell>{device.ip_address}</TableCell>
                        <TableCell>{device.port}</TableCell>
                        <TableCell>{device.type}</TableCell>
                        <TableCell>{device.model}</TableCell>
                        <TableCell>{device.serial_number || "-"}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClasses[getLiveStatus(device)] ?? statusClasses.unknown}`}
                          >
                            {t(`status.${getLiveStatus(device)}`, { ns: "views/organization", defaultValue: device.status || "unknown" })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {device.last_checked_at ? new Date(device.last_checked_at * 1000).toLocaleString() : "-"}
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setControllerDetail(device)}
                          >
                            <LuEye className="mr-1 size-4" />
                            {t("button.details", { ns: "views/organization" })}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDeviceEditor({
                                mode: "edit",
                                device,
                              })
                            }
                          >
                            <LuPencil className="mr-1 size-4" />
                            {t("button.edit", { ns: "common" })}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(device.id)}
                            disabled={retrying.includes(device.id) || connectingAll}
                          >
                            <LuRotateCcw className="mr-1 size-4" />
                            {t("button.retry", { ns: "common" })}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget({ id: device.id, name: device.name || device.id })}
                          >
                            <LuTrash2 className="mr-1 size-4" />
                            {t("button.delete", { ns: "common" })}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground">
                {t("events.filter", { ns: "views/organization" })}
              </label>
              <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder={t("events.all", { ns: "views/organization" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("events.all", { ns: "views/organization" })}</SelectItem>
                  {deviceList.map((device) => (
                    <SelectItem key={device.id} value={device.id}>
                      {device.name || device.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("events.table.time", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("events.table.device", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("events.table.code", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("events.table.action", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("events.table.card", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("events.table.owners", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("events.table.people", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("events.table.verification", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("events.table.footage", { ns: "views/organization" })}</TableHead>
                    <TableHead>{t("events.table.details", { ns: "views/organization" })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-sm text-muted-foreground">
                        {t("events.empty", { ns: "views/organization" })}
                      </TableCell>
                    </TableRow>
                  ) : (
                    eventList.map((event, index) => {
                      const details =
                        typeof event.data === "string"
                          ? event.data
                          : event.data && Object.keys(event.data).length > 0
                            ? JSON.stringify(event.data)
                            : JSON.stringify(event);

                      return (
                        <TableRow key={event.id ?? `${event.device_id ?? "device"}-${index}`}>
                          <TableCell>
                            {event.time ?? event.Time ??
                              (typeof event.timestamp === "number"
                                ? new Date(event.timestamp * 1000).toLocaleString()
                                : event.timestamp ?? "-")}
                          </TableCell>
                          <TableCell>{event.device_name ?? event.device_id ?? "-"}</TableCell>
                          <TableCell>{String(event.code ?? event.Code ?? "-")}</TableCell>
                          <TableCell>{String(event.action ?? "-")}</TableCell>
                          <TableCell>{event.card_number || "-"}</TableCell>
                          <TableCell>{event.owner_names?.join(", ") || "-"}</TableCell>
                          <TableCell>{event.people?.map((person) => person.name).join(", ") || "-"}</TableCell>
                          <TableCell>
                            <span className={verificationClasses[event.verification_status ?? "unverified"]}>
                              {t(`verification.${event.verification_status ?? "unverified"}`, { ns: "views/organization" })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!event.camera || event.clip_start === undefined || event.clip_end === undefined}
                              onClick={() => setFootageEvent(event)}
                            >
                              <LuPlay className="mr-1 size-4" />
                              {t("button.viewFootage", { ns: "views/organization" })}
                            </Button>
                          </TableCell>
                          <TableCell className="max-w-md truncate">{details}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {deviceEditor && (
        <DeviceEditorDialog
          mode={deviceEditor.mode}
          initialDevice={deviceEditor.device}
          cameraOptions={cameraOptions}
          onClose={() => setDeviceEditor(null)}
          onSave={handleSave}
        />
      )}

      {controllerDetail && (
        <ControllerDetailsDialog
          device={controllerDetail}
          onClose={() => setControllerDetail(null)}
        />
      )}

      {footageEvent && (
        <Dialog open={true} onOpenChange={(open) => !open && setFootageEvent(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{t("footage.title", { ns: "views/organization" })}</DialogTitle>
            </DialogHeader>
            {footageEvent.camera && footageEvent.clip_start !== undefined && footageEvent.clip_end !== undefined ? (
              <div className="aspect-video">
                <GenericVideoPlayer
                  source={`${baseUrl}api/vod/clip/${encodeURIComponent(footageEvent.camera)}/start/${footageEvent.clip_start}/end/${footageEvent.clip_end}/index.m3u8`}
                />
              </div>
            ) : (
              <p>{t("footage.unavailable", { ns: "views/organization" })}</p>
            )}
          </DialogContent>
        </Dialog>
      )}

      {deleteTarget && (
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("delete.title", { ns: "views/organization" })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("delete.description", { ns: "views/organization" ,  name: deleteTarget.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("button.cancel", { ns: "common" })}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                {t("button.delete", { ns: "common" })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

type DeviceEditorDialogProps = {
  mode: "create" | "edit";
  initialDevice: AccessControllerRecord | null;
  cameraOptions: { value: string; label: string }[];
  onClose: () => void;
  onSave: (values: DeviceFormValues, mode: "create" | "edit") => Promise<void>;
};

function DeviceEditorDialog({
  mode,
  initialDevice,
  cameraOptions,
  onClose,
  onSave,
}: DeviceEditorDialogProps) {
  const { t } = useTranslation(["common", "views/organization"]);
  const [values, setValues] = useState<DeviceFormValues>({
    id: initialDevice?.id ?? "",
    name: initialDevice?.name ?? "",
    username: initialDevice?.username ?? "",
    password: initialDevice?.password ?? "",
    ipAddress: initialDevice?.ip_address ?? "",
    port: initialDevice?.port ?? 80,
    sdkPort: initialDevice?.sdk_port ?? 37777,
    provider: initialDevice?.provider ?? "cgi",
    useHttps: initialDevice?.use_https ?? false,
    eventApi: initialDevice?.event_api ?? "eventManager",
    associatedCamera: initialDevice?.associated_camera ?? "",
    secondsBefore: initialDevice?.seconds_before ?? 10,
    secondsAfter: initialDevice?.seconds_after ?? 10,
    clearCredentials: false,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave(values, mode);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? t("dialog.createTitle", { ns: "views/organization" })
              : t("dialog.editTitle", { ns: "views/organization" })}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.id", { ns: "views/organization" })}</label>
              <Input
                value={values.id}
                onChange={(event) => setValues({ ...values, id: event.target.value })}
                disabled={mode === "edit"}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.name", { ns: "views/organization" })}</label>
              <Input
                value={values.name}
                onChange={(event) => setValues({ ...values, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.username", { ns: "views/organization" })}</label>
              <Input
                value={values.username}
                onChange={(event) => setValues({ ...values, username: event.target.value })}
                placeholder={t("dialog.usernamePlaceholder", { ns: "views/organization" })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.password", { ns: "views/organization" })}</label>
              <Input
                type="password"
                value={values.password}
                onChange={(event) => setValues({ ...values, password: event.target.value })}
                placeholder={t("dialog.passwordPlaceholder", { ns: "views/organization" })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.ipAddress", { ns: "views/organization" })}</label>
              <Input
                value={values.ipAddress}
                onChange={(event) => setValues({ ...values, ipAddress: event.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.port", { ns: "views/organization" })}</label>
              <Input
                type="number"
                min={1}
                max={65535}
                value={values.port}
                onChange={(event) => setValues({ ...values, port: Number(event.target.value) || 80 })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.provider", { ns: "views/organization" })}</label>
              <Select
                value={values.provider}
                onValueChange={(value: "cgi" | "netsdk") => setValues({ ...values, provider: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cgi">{t("dialog.providerCgi", { ns: "views/organization" })}</SelectItem>
                  <SelectItem value="netsdk">{t("dialog.providerNetSdk", { ns: "views/organization" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.eventApi", { ns: "views/organization" })}</label>
              <Select
                value={values.eventApi}
                onValueChange={(value: "eventManager" | "snapManager") => setValues({ ...values, eventApi: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eventManager">{t("dialog.eventManager", { ns: "views/organization" })}</SelectItem>
                  <SelectItem value="snapManager">{t("dialog.snapManager", { ns: "views/organization" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.sdkPort", { ns: "views/organization" })}</label>
              <Input
                type="number"
                min={1}
                max={65535}
                value={values.sdkPort}
                onChange={(event) => setValues({ ...values, sdkPort: Number(event.target.value) || 37777 })}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
              <Input
                className="size-4"
                type="checkbox"
                checked={values.useHttps}
                onChange={(event) => setValues({ ...values, useHttps: event.target.checked })}
              />
              {t("dialog.https", { ns: "views/organization" })}
            </label>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">{t("dialog.associatedCamera", { ns: "views/organization" })}</label>
              <Select
                value={values.associatedCamera || "none"}
                onValueChange={(value) =>
                  setValues({
                    ...values,
                    associatedCamera: value === "none" ? "" : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("dialog.associatedCameraPlaceholder", { ns: "views/organization" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("dialog.noCamera", { ns: "views/organization" })}</SelectItem>
                  {cameraOptions.map((camera) => (
                    <SelectItem key={camera.value} value={camera.value}>
                      {camera.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.secondsBefore", { ns: "views/organization" })}</label>
              <Input
                type="number"
                min={0}
                max={300}
                value={values.secondsBefore}
                onChange={(event) => setValues({ ...values, secondsBefore: Number(event.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("dialog.secondsAfter", { ns: "views/organization" })}</label>
              <Input
                type="number"
                min={0}
                max={300}
                value={values.secondsAfter}
                onChange={(event) => setValues({ ...values, secondsAfter: Number(event.target.value) })}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("dialog.providerHelp", { ns: "views/organization" })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(mode === "create" ? "dialog.nonAuth" : "dialog.keepCredentials", { ns: "views/organization" })}
          </p>
          {mode === "edit" && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.clearCredentials}
                onChange={(event) => setValues({ ...values, clearCredentials: event.target.checked })}
              />
              {t("dialog.clearCredentials", { ns: "views/organization" })}
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("button.cancel", { ns: "common" })}
            </Button>
            <Button type="submit">
              {mode === "create" ? t("button.add", { ns: "common" }) : t("button.save", { ns: "common" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ControllerDetailsDialog({
  device,
  onClose,
}: {
  device: AccessControllerRecord;
  onClose: () => void;
}) {
  const { t } = useTranslation(["views/organization"]);
  const {
    data: doorResult,
    error: doorsError,
    mutate: refreshDoors,
  } = useSWR<{ doors: AccessDoor[] }>(`access-controllers/${device.id}/doors`, {
    revalidateOnFocus: false,
  });
  const { data: preview } = useSWR<ControllerPreview>(
    `access-controllers/${device.id}/preview`,
    { revalidateOnFocus: false },
  );
  const { data: systemResult } = useSWR<{ system_info: Record<string, unknown> }>(
    `access-controllers/${device.id}/system-info`,
    { revalidateOnFocus: false },
  );
  const { data: capabilityResult } = useSWR<{
    capabilities: Record<string, { status: string; reason: string }>;
  }>(`access-controllers/${device.id}/capabilities`, { revalidateOnFocus: false });

  const capabilityNames: Record<string, string> = {
    get_system_info: t("details.capabilityNames.systemInfo"),
    is_online: t("details.capabilityNames.connection"),
    get_access_records: t("details.capabilityNames.history"),
    get_card_owners: t("details.capabilityNames.cardOwners"),
    listen_events: t("details.capabilityNames.liveEvents"),
    get_doors: t("details.capabilityNames.doorDiscovery"),
    get_door_status: t("details.capabilityNames.doorStatus"),
    open_door: t("details.capabilityNames.unlock"),
    close_door: t("details.capabilityNames.relock"),
    get_snapshot: t("details.capabilityNames.snapshot"),
    get_preview: t("details.capabilityNames.preview"),
    get_preview_clip: t("details.capabilityNames.previewClip"),
  };
  const capabilityStatuses: Record<string, string> = {
    untested: t("details.capabilityStatuses.untested"),
    "runtime-unavailable": t("details.capabilityStatuses.runtimeUnavailable"),
    available: t("details.capabilityStatuses.available"),
    supported: t("details.capabilityStatuses.available"),
    unsupported: t("details.capabilityStatuses.unsupported"),
  };

  const previewUrl = preview?.source === "frigate_camera"
    ? `${baseUrl}${preview.image_url}`
    : preview?.snapshot_url
      ? `${baseUrl}api/${preview.snapshot_url}`
      : undefined;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{device.name || device.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="font-semibold">{t("details.systemInfo")}</h3>
            <p className="text-sm text-muted-foreground">
              {device.model} · {device.serial_number || t("details.notReported")}
            </p>
            {systemResult?.system_info && (
              <pre className="max-h-40 overflow-auto rounded bg-muted p-3 text-xs">
                {JSON.stringify(systemResult.system_info, null, 2)}
              </pre>
            )}
            <p className="text-xs text-muted-foreground">
              {t("details.selectedProvider", { provider: device.provider })}
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">{t("details.preview")}</h3>
            {previewUrl ? (
              <img className="max-h-80 max-w-full rounded object-contain" src={previewUrl} alt={t("details.previewAlt")} />
            ) : (
              <p className="text-sm text-muted-foreground">{t("details.previewUnavailable")}</p>
            )}
            {preview?.provider_diagnostic && (
              <details className="text-xs text-muted-foreground">
                <summary>{t("details.previewDiagnostic")}</summary>
                <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2">
                  {JSON.stringify(preview.provider_diagnostic, null, 2)}
                </pre>
              </details>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t("details.doors")}</h3>
              <Button variant="outline" size="sm" onClick={() => void refreshDoors()}>
                <LuRotateCcw className="mr-2 size-4" />
                {t("details.refreshDoors")}
              </Button>
            </div>
            {doorsError && (
              <p className="text-sm text-destructive">
                {getErrorMessage(doorsError, t("details.doorsUnavailable"))}
              </p>
            )}
            {!doorsError && doorResult?.doors.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("details.noDoors")}</p>
            )}
            <div className="space-y-2">
              {doorResult?.doors.map((door) => (
                <DoorControlRow key={door.id} deviceId={device.id} door={door} />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">{t("details.capabilities")}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(capabilityResult?.capabilities ?? {}).map(([name, capability]) => (
                <div key={name} className="rounded border px-3 py-2 text-sm">
                  <span className="font-medium">{capabilityNames[name] ?? name}</span>
                  <span className="ml-2 text-muted-foreground">
                    {capabilityStatuses[capability.status] ?? capability.status}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">{capability.reason}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DoorControlRow({ deviceId, door }: { deviceId: string; door: AccessDoor }) {
  const { t } = useTranslation(["views/organization"]);
  const [busy, setBusy] = useState<"open" | "close" | null>(null);
  const {
    data: currentStatus,
    error,
    mutate,
  } = useSWR<AccessDoor>(`access-controllers/${deviceId}/doors/${encodeURIComponent(door.id)}`, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
  });

  const handleCommand = async (action: "open" | "close") => {
    setBusy(action);
    try {
      const { data } = await axios.post<{ message: string }>(
        `access-controllers/${deviceId}/doors/${encodeURIComponent(door.id)}/${action}`,
      );
      toast.success(data.message || t("details.commandAccepted"), { position: "top-center" });
      await mutate();
    } catch (commandError) {
      toast.error(getErrorMessage(commandError, t("details.commandFailed")), {
        position: "top-center",
      });
    } finally {
      setBusy(null);
    }
  };

  const status = currentStatus?.status ?? door.status ?? "unknown";
  const localizedStatus =
    status === "open"
      ? t("details.doorStates.open")
      : status === "closed"
        ? t("details.doorStates.closed")
        : t("details.doorStates.unknown");
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="font-medium"><LuDoorOpen className="mr-2 inline size-4" />{door.name}</p>
        <p className="text-xs text-muted-foreground">
          {t("details.doorStatus", {
            status: error ? t("details.unavailable") : localizedStatus,
          })}
          {currentStatus?.online === false ? ` · ${t("details.offline")}` : ""}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void handleCommand("open")}>
          <LuLockOpen className="mr-1 size-4" />
          {busy === "open" ? t("details.sending") : t("details.open")}
        </Button>
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void handleCommand("close")}>
          <LuLock className="mr-1 size-4" />
          {busy === "close" ? t("details.sending") : t("details.close")}
        </Button>
      </div>
      <p className="w-full text-xs text-muted-foreground">{t("details.lockCommandNote")}</p>
    </div>
  );
}
