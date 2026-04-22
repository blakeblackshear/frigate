import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import axios from "axios";
import isEqual from "lodash/isEqual";
import { toast } from "sonner";
import {
  LuChevronDown,
  LuExternalLink,
  LuEye,
  LuEyeOff,
  LuPencil,
  LuPlus,
  LuTrash2,
} from "react-icons/lu";
import { Link } from "react-router-dom";
import Heading from "@/components/ui/heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ActivityIndicator from "@/components/indicators/activity-indicator";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { FrigateConfig } from "@/types/frigateConfig";
import { cn } from "@/lib/utils";
import {
  isMaskedPath,
  hasCredentials,
  maskCredentials,
} from "@/utils/credentialMask";
import {
  parseFfmpegUrl,
  buildFfmpegUrl,
  toggleFfmpegMode,
  type FfmpegVideoOption,
  type FfmpegAudioOption,
  type FfmpegHardwareOption,
} from "@/utils/go2rtcFfmpeg";

type RawPathsResponse = {
  cameras: Record<
    string,
    { ffmpeg: { inputs: { path: string; roles: string[] }[] } }
  >;
  go2rtc: { streams: Record<string, string | string[]> };
};

type Go2RtcStreamsSettingsViewProps = {
  setUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
  onSectionStatusChange?: (
    sectionKey: string,
    level: "global" | "camera",
    status: {
      hasChanges: boolean;
      isOverridden: boolean;
      hasValidationErrors: boolean;
    },
  ) => void;
};

const STREAM_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

function normalizeStreams(
  streams: Record<string, string | string[]> | undefined,
): Record<string, string[]> {
  if (!streams) return {};
  const result: Record<string, string[]> = {};
  for (const [name, urls] of Object.entries(streams)) {
    result[name] = Array.isArray(urls) ? urls : [urls];
  }
  return result;
}

export default function Go2RtcStreamsSettingsView({
  setUnsavedChanges,
  onSectionStatusChange,
}: Go2RtcStreamsSettingsViewProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { getLocaleDocUrl } = useDocDomain();
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const { data: rawPaths, mutate: updateRawPaths } =
    useSWR<RawPathsResponse>("config/raw_paths");

  const [editedStreams, setEditedStreams] = useState<Record<string, string[]>>(
    {},
  );
  const [serverStreams, setServerStreams] = useState<Record<string, string[]>>(
    {},
  );
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [credentialVisibility, setCredentialVisibility] = useState<
    Record<string, boolean>
  >({});
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [renameDialog, setRenameDialog] = useState<string | null>(null);
  const [addStreamDialogOpen, setAddStreamDialogOpen] = useState(false);
  const [newlyAdded, setNewlyAdded] = useState<Set<string>>(new Set());

  // Initialize from config — wait for both config and rawPaths to avoid
  // a mismatch when rawPaths arrives after config with different data
  useEffect(() => {
    if (!config || !rawPaths) return;

    // Always use rawPaths for go2rtc streams — the /config endpoint masks
    // credentials, so using config.go2rtc.streams would save masked values
    const normalized = normalizeStreams(rawPaths.go2rtc?.streams);

    setServerStreams(normalized);
    if (!initialized) {
      setEditedStreams(normalized);
      setInitialized(true);
    }
  }, [config, rawPaths, initialized]);

  // Track unsaved changes
  const hasChanges = useMemo(
    () => initialized && !isEqual(editedStreams, serverStreams),
    [editedStreams, serverStreams, initialized],
  );

  useEffect(() => {
    setUnsavedChanges(hasChanges);
  }, [hasChanges, setUnsavedChanges]);

  const hasValidationErrors = useMemo(() => {
    const names = Object.keys(editedStreams);
    const seenNames = new Set<string>();

    for (const name of names) {
      if (!name.trim() || !STREAM_NAME_PATTERN.test(name)) return true;
      if (seenNames.has(name)) return true;
      seenNames.add(name);

      const urls = editedStreams[name];
      if (!urls || urls.length === 0 || urls.every((u) => !u.trim()))
        return true;
    }

    return false;
  }, [editedStreams]);

  // Report status to parent for sidebar red dot
  useEffect(() => {
    onSectionStatusChange?.("go2rtc_streams", "global", {
      hasChanges: hasChanges,
      isOverridden: false,
      hasValidationErrors,
    });
  }, [hasChanges, hasValidationErrors, onSectionStatusChange]);

  // Save handler
  const saveToConfig = useCallback(async () => {
    setIsLoading(true);

    try {
      const streamsPayload: Record<string, string[] | string> = {
        ...editedStreams,
      };
      const deletedStreamNames = Object.keys(serverStreams).filter(
        (name) => !(name in editedStreams),
      );
      for (const deleted of deletedStreamNames) {
        streamsPayload[deleted] = "";
      }

      await axios.put("config/set", {
        requires_restart: 0,
        config_data: { go2rtc: { streams: streamsPayload } },
      });

      // Update running go2rtc instance
      const go2rtcUpdates: Promise<unknown>[] = [];
      for (const [streamName, urls] of Object.entries(editedStreams)) {
        if (urls[0]) {
          go2rtcUpdates.push(
            axios.put(
              `go2rtc/streams/${streamName}?src=${encodeURIComponent(urls[0])}`,
            ),
          );
        }
      }
      for (const deleted of deletedStreamNames) {
        go2rtcUpdates.push(axios.delete(`go2rtc/streams/${deleted}`));
      }
      await Promise.allSettled(go2rtcUpdates);

      toast.success(
        t("toast.success", {
          ns: "views/settings",
          defaultValue: "Settings saved successfully",
        }),
      );

      setServerStreams(editedStreams);
      updateConfig();
      updateRawPaths();
    } catch {
      toast.error(
        t("toast.error", {
          ns: "views/settings",
          defaultValue: "Failed to save settings",
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }, [editedStreams, serverStreams, t, updateConfig, updateRawPaths]);

  // Reset handler
  const onReset = useCallback(() => {
    setEditedStreams(serverStreams);
    setCredentialVisibility({});
  }, [serverStreams]);

  // Stream CRUD operations
  const addStream = useCallback((name: string) => {
    setEditedStreams((prev) => ({ ...prev, [name]: [""] }));
    setNewlyAdded((prev) => new Set(prev).add(name));
    setAddStreamDialogOpen(false);
  }, []);

  const deleteStream = useCallback((streamName: string) => {
    setEditedStreams((prev) => {
      const { [streamName]: _, ...rest } = prev;
      return rest;
    });
    setDeleteDialog(null);
  }, []);

  const renameStream = useCallback((oldName: string, newName: string) => {
    if (oldName === newName || !newName.trim()) return;

    setEditedStreams((prev) => {
      const urls = prev[oldName];
      if (!urls) return prev;

      const entries = Object.entries(prev);
      const result: Record<string, string[]> = {};
      for (const [key, value] of entries) {
        if (key === oldName) {
          result[newName] = value;
        } else {
          result[key] = value;
        }
      }
      return result;
    });
  }, []);

  const updateUrl = useCallback(
    (streamName: string, urlIndex: number, newUrl: string) => {
      setEditedStreams((prev) => {
        const urls = [...(prev[streamName] || [])];
        urls[urlIndex] = newUrl;
        return { ...prev, [streamName]: urls };
      });
    },
    [],
  );

  const addUrl = useCallback((streamName: string) => {
    setEditedStreams((prev) => {
      const urls = [...(prev[streamName] || []), ""];
      return { ...prev, [streamName]: urls };
    });
  }, []);

  const removeUrl = useCallback((streamName: string, urlIndex: number) => {
    setEditedStreams((prev) => {
      const urls = (prev[streamName] || []).filter((_, i) => i !== urlIndex);
      return { ...prev, [streamName]: urls.length > 0 ? urls : [""] };
    });
  }, []);

  const toggleCredentialVisibility = useCallback((key: string) => {
    setCredentialVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (!config) return null;

  const streamEntries = Object.entries(editedStreams);

  return (
    <div className="flex size-full flex-col lg:pr-2">
      <div className="max-w-4xl">
        <div className="mb-5 flex flex-col">
          <Heading as="h4">{t("go2rtcStreams.title")}</Heading>
          <div className="my-1 text-sm text-muted-foreground">
            {t("go2rtcStreams.description")}
          </div>
          <div className="flex items-center text-sm text-primary-variant">
            <Link
              to={getLocaleDocUrl("guides/configuring_go2rtc")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline"
            >
              {t("readTheDocumentation", { ns: "common" })}
              <LuExternalLink className="ml-2 inline-flex size-3" />
            </Link>
          </div>
        </div>

        {streamEntries.length === 0 && (
          <div className="my-8 text-center text-sm text-muted-foreground">
            {t("go2rtcStreams.noStreams")}
          </div>
        )}

        <div className="space-y-4">
          {streamEntries.map(([streamName, urls]) => (
            <StreamCard
              key={streamName}
              streamName={streamName}
              urls={urls}
              credentialVisibility={credentialVisibility}
              defaultOpen={newlyAdded.has(streamName)}
              onRename={() => setRenameDialog(streamName)}
              onDelete={() => setDeleteDialog(streamName)}
              onUpdateUrl={updateUrl}
              onAddUrl={() => addUrl(streamName)}
              onRemoveUrl={(urlIndex) => removeUrl(streamName, urlIndex)}
              onToggleCredentialVisibility={toggleCredentialVisibility}
            />
          ))}
        </div>

        <Button
          type="button"
          onClick={() => setAddStreamDialogOpen(true)}
          variant="outline"
          className="my-4"
        >
          <LuPlus className="mr-2 size-4" />
          {t("go2rtcStreams.addStream")}
        </Button>
      </div>

      {/* Sticky save/undo buttons */}
      <div className="sticky bottom-0 z-50 w-full border-t border-secondary bg-background pt-0">
        <div
          className={cn(
            "flex flex-col items-center gap-4 pt-2 md:flex-row",
            hasChanges ? "justify-between" : "justify-end",
          )}
        >
          {hasChanges && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-unsaved">
                {t("unsavedChanges")}
              </span>
            </div>
          )}
          <div className="flex w-full items-center gap-2 md:w-auto">
            {hasChanges && (
              <Button
                onClick={onReset}
                variant="outline"
                disabled={isLoading}
                className="flex min-w-36 flex-1 gap-2"
              >
                {t("button.undo", { ns: "common" })}
              </Button>
            )}
            <Button
              onClick={saveToConfig}
              variant="select"
              disabled={!hasChanges || isLoading || hasValidationErrors}
              className="flex min-w-36 flex-1 gap-2"
            >
              {isLoading ? (
                <>
                  <ActivityIndicator className="h-4 w-4" />
                  {t("button.saving", { ns: "common" })}
                </>
              ) : (
                t("button.save", { ns: "common" })
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("go2rtcStreams.deleteStream")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("go2rtcStreams.deleteStreamConfirm", {
                streamName: deleteDialog ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("button.cancel", { ns: "common" })}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                buttonVariants({ variant: "destructive" }),
                "text-white",
              )}
              onClick={() => deleteDialog && deleteStream(deleteDialog)}
            >
              {t("go2rtcStreams.deleteStream")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename dialog */}
      <RenameStreamDialog
        open={renameDialog !== null}
        streamName={renameDialog ?? ""}
        allStreamNames={Object.keys(editedStreams)}
        onRename={(oldName, newName) => {
          renameStream(oldName, newName);
          setRenameDialog(null);
        }}
        onClose={() => setRenameDialog(null)}
      />

      <AddStreamDialog
        open={addStreamDialogOpen}
        allStreamNames={Object.keys(editedStreams)}
        onAdd={addStream}
        onClose={() => setAddStreamDialogOpen(false)}
      />
    </div>
  );
}

// --- RenameStreamDialog ---

type RenameStreamDialogProps = {
  open: boolean;
  streamName: string;
  allStreamNames: string[];
  onRename: (oldName: string, newName: string) => void;
  onClose: () => void;
};

function RenameStreamDialog({
  open,
  streamName,
  allStreamNames,
  onRename,
  onClose,
}: RenameStreamDialogProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (open) {
      setNewName(streamName);
    }
  }, [open, streamName]);

  const nameError = useMemo(() => {
    if (!newName.trim()) {
      return t("go2rtcStreams.validation.nameRequired");
    }
    if (!STREAM_NAME_PATTERN.test(newName)) {
      return t("go2rtcStreams.validation.nameInvalid");
    }
    if (newName !== streamName && allStreamNames.includes(newName)) {
      return t("go2rtcStreams.validation.nameDuplicate");
    }
    return null;
  }, [newName, streamName, allStreamNames, t]);

  const canSubmit = !nameError && newName !== streamName;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("go2rtcStreams.renameStream")}</DialogTitle>
          <DialogDescription>
            {t("go2rtcStreams.renameStreamDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>{t("go2rtcStreams.newStreamName")}</Label>
          <Input
            className="text-md"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) {
                onRename(streamName, newName);
              }
            }}
            autoFocus
          />
          {nameError && newName !== streamName && (
            <p className="text-xs text-destructive">{nameError}</p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-end md:gap-0">
          <DialogClose asChild>
            <Button>{t("button.cancel", { ns: "common" })}</Button>
          </DialogClose>
          <Button
            variant="select"
            disabled={!canSubmit}
            onClick={() => onRename(streamName, newName)}
          >
            {t("go2rtcStreams.renameStream")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AddStreamDialogProps = {
  open: boolean;
  allStreamNames: string[];
  onAdd: (name: string) => void;
  onClose: () => void;
};

function AddStreamDialog({
  open,
  allStreamNames,
  onAdd,
  onClose,
}: AddStreamDialogProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
    }
  }, [open]);

  const nameError = useMemo(() => {
    if (!name.trim()) {
      return t("go2rtcStreams.validation.nameRequired");
    }
    if (!STREAM_NAME_PATTERN.test(name)) {
      return t("go2rtcStreams.validation.nameInvalid");
    }
    if (allStreamNames.includes(name)) {
      return t("go2rtcStreams.validation.nameDuplicate");
    }
    return null;
  }, [name, allStreamNames, t]);

  const canSubmit = !nameError;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("go2rtcStreams.addStream")}</DialogTitle>
          <DialogDescription>
            {t("go2rtcStreams.addStreamDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>{t("go2rtcStreams.streamName")}</Label>
          <Input
            value={name}
            className="text-md"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) {
                onAdd(name);
              }
            }}
            placeholder="camera_name"
            autoFocus
          />
          {nameError && name.length > 0 && (
            <p className="text-xs text-destructive">{nameError}</p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-end md:gap-0">
          <DialogClose asChild>
            <Button>{t("button.cancel", { ns: "common" })}</Button>
          </DialogClose>
          <Button
            variant="select"
            disabled={!canSubmit}
            onClick={() => onAdd(name)}
          >
            {t("go2rtcStreams.addStream")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type StreamCardProps = {
  streamName: string;
  urls: string[];
  credentialVisibility: Record<string, boolean>;
  onRename: () => void;
  onDelete: () => void;
  onUpdateUrl: (streamName: string, urlIndex: number, newUrl: string) => void;
  onAddUrl: () => void;
  onRemoveUrl: (urlIndex: number) => void;
  onToggleCredentialVisibility: (key: string) => void;
  defaultOpen?: boolean;
};

function StreamCard({
  streamName,
  urls,
  credentialVisibility,
  onRename,
  onDelete,
  onUpdateUrl,
  onAddUrl,
  onRemoveUrl,
  onToggleCredentialVisibility,
  defaultOpen = false,
}: StreamCardProps) {
  const { t } = useTranslation("views/settings");
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="bg-secondary text-primary">
      <CardContent className="p-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{streamName}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRename}
                className="size-7 p-0 text-muted-foreground hover:text-primary"
              >
                <LuPencil className="size-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="text-secondary-foreground hover:text-secondary-foreground"
              >
                <LuTrash2 className="size-5" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <LuChevronDown
                    className={cn(
                      "size-5 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CollapsibleContent>
            <div className="space-y-3 px-4 pb-4">
              {urls.map((url, urlIndex) => (
                <StreamUrlEntry
                  key={urlIndex}
                  streamName={streamName}
                  url={url}
                  urlIndex={urlIndex}
                  canRemove={urls.length > 1}
                  showCredentials={
                    credentialVisibility[`${streamName}-${urlIndex}`] ?? false
                  }
                  onUpdateUrl={onUpdateUrl}
                  onRemoveUrl={() => onRemoveUrl(urlIndex)}
                  onToggleCredentialVisibility={() =>
                    onToggleCredentialVisibility(`${streamName}-${urlIndex}`)
                  }
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddUrl}
                className="w-fit"
              >
                <LuPlus className="mr-2 size-4" />
                {t("go2rtcStreams.addUrl")}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

type StreamUrlEntryProps = {
  streamName: string;
  url: string;
  urlIndex: number;
  canRemove: boolean;
  showCredentials: boolean;
  onUpdateUrl: (streamName: string, urlIndex: number, newUrl: string) => void;
  onRemoveUrl: () => void;
  onToggleCredentialVisibility: () => void;
};

function StreamUrlEntry({
  streamName,
  url,
  urlIndex,
  canRemove,
  showCredentials,
  onUpdateUrl,
  onRemoveUrl,
  onToggleCredentialVisibility,
}: StreamUrlEntryProps) {
  const { t } = useTranslation("views/settings");
  const [isFocused, setIsFocused] = useState(false);
  const parsed = useMemo(() => parseFfmpegUrl(url), [url]);

  const rawBaseUrl = parsed.isFfmpeg ? parsed.baseUrl : url;
  const canToggleCredentials =
    hasCredentials(rawBaseUrl) && !isMaskedPath(rawBaseUrl);

  const baseUrlForDisplay = useMemo(() => {
    // Never mask while the input is focused — the user may be typing credentials
    if (isFocused) return rawBaseUrl;
    if (!showCredentials && hasCredentials(rawBaseUrl)) {
      return maskCredentials(rawBaseUrl);
    }
    return rawBaseUrl;
  }, [rawBaseUrl, showCredentials, isFocused]);

  const isTranscodingVideo =
    parsed.isFfmpeg && parsed.video !== "copy" && parsed.video !== "exclude";

  const handleBaseUrlChange = useCallback(
    (newBaseUrl: string) => {
      if (parsed.isFfmpeg) {
        const newUrl = buildFfmpegUrl({ ...parsed, baseUrl: newBaseUrl });
        onUpdateUrl(streamName, urlIndex, newUrl);
      } else {
        onUpdateUrl(streamName, urlIndex, newBaseUrl);
      }
    },
    [parsed, streamName, urlIndex, onUpdateUrl],
  );

  const handleFfmpegToggle = useCallback(
    (enabled: boolean) => {
      const newUrl = toggleFfmpegMode(url, enabled);
      onUpdateUrl(streamName, urlIndex, newUrl);
    },
    [url, streamName, urlIndex, onUpdateUrl],
  );

  const handleFfmpegOptionChange = useCallback(
    (
      field: "video" | "audio" | "hardware",
      value: FfmpegVideoOption | FfmpegAudioOption | FfmpegHardwareOption,
    ) => {
      const updated = { ...parsed, [field]: value };
      // Clear hardware when switching away from transcoding video
      if (field === "video" && (value === "copy" || value === "exclude")) {
        updated.hardware = "none";
      }
      const newUrl = buildFfmpegUrl(updated);
      onUpdateUrl(streamName, urlIndex, newUrl);
    },
    [parsed, streamName, urlIndex, onUpdateUrl],
  );

  const audioDisplayLabel = useMemo(() => {
    const labels: Record<string, string> = {
      copy: t("go2rtcStreams.ffmpeg.audioCopy"),
      aac: t("go2rtcStreams.ffmpeg.audioAac"),
      opus: t("go2rtcStreams.ffmpeg.audioOpus"),
      pcmu: t("go2rtcStreams.ffmpeg.audioPcmu"),
      pcma: t("go2rtcStreams.ffmpeg.audioPcma"),
      pcm: t("go2rtcStreams.ffmpeg.audioPcm"),
      mp3: t("go2rtcStreams.ffmpeg.audioMp3"),
      exclude: t("go2rtcStreams.ffmpeg.audioExclude"),
    };
    return labels[parsed.audio] || parsed.audio;
  }, [parsed.audio, t]);

  return (
    <div className="space-y-2 rounded-lg bg-background p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            className="text-md h-8 pr-10"
            value={baseUrlForDisplay}
            onChange={(e) => handleBaseUrlChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t("go2rtcStreams.streamUrlPlaceholder")}
          />
          {canToggleCredentials && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={onToggleCredentialVisibility}
            >
              {showCredentials ? (
                <LuEyeOff className="size-4" />
              ) : (
                <LuEye className="size-4" />
              )}
            </Button>
          )}
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemoveUrl}
            className="text-secondary-foreground hover:text-secondary-foreground"
          >
            <LuTrash2 className="size-4" />
          </Button>
        )}
      </div>

      {/* ffmpeg module toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          checked={parsed.isFfmpeg}
          onCheckedChange={handleFfmpegToggle}
        />
        <Label className="text-sm">
          {t("go2rtcStreams.ffmpeg.useFfmpegModule")}
        </Label>
      </div>

      {/* ffmpeg options */}
      {parsed.isFfmpeg && (
        <div
          className={cn(
            "grid grid-cols-1 gap-3 pl-4",
            isTranscodingVideo ? "sm:grid-cols-3" : "sm:grid-cols-2",
          )}
        >
          {/* Video */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              {t("go2rtcStreams.ffmpeg.video")}
            </Label>
            <Select
              value={parsed.video}
              onValueChange={(v) =>
                handleFfmpegOptionChange("video", v as FfmpegVideoOption)
              }
            >
              <SelectTrigger className="h-8">
                {parsed.video === "copy"
                  ? t("go2rtcStreams.ffmpeg.videoCopy")
                  : parsed.video === "h264"
                    ? t("go2rtcStreams.ffmpeg.videoH264")
                    : parsed.video === "h265"
                      ? t("go2rtcStreams.ffmpeg.videoH265")
                      : t("go2rtcStreams.ffmpeg.videoExclude")}
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="copy">
                    {t("go2rtcStreams.ffmpeg.videoCopy")}
                  </SelectItem>
                  <SelectItem value="h264">
                    {t("go2rtcStreams.ffmpeg.videoH264")}
                  </SelectItem>
                  <SelectItem value="h265">
                    {t("go2rtcStreams.ffmpeg.videoH265")}
                  </SelectItem>
                  <SelectItem value="exclude">
                    {t("go2rtcStreams.ffmpeg.videoExclude")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Audio */}
          <div className="space-y-1">
            <Label className="text-xs font-medium">
              {t("go2rtcStreams.ffmpeg.audio")}
            </Label>
            <Select
              value={parsed.audio}
              onValueChange={(v) =>
                handleFfmpegOptionChange("audio", v as FfmpegAudioOption)
              }
            >
              <SelectTrigger className="h-8">{audioDisplayLabel}</SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="copy">
                    {t("go2rtcStreams.ffmpeg.audioCopy")}
                  </SelectItem>
                  <SelectItem value="aac">
                    {t("go2rtcStreams.ffmpeg.audioAac")}
                  </SelectItem>
                  <SelectItem value="opus">
                    {t("go2rtcStreams.ffmpeg.audioOpus")}
                  </SelectItem>
                  <SelectItem value="pcmu">
                    {t("go2rtcStreams.ffmpeg.audioPcmu")}
                  </SelectItem>
                  <SelectItem value="pcma">
                    {t("go2rtcStreams.ffmpeg.audioPcma")}
                  </SelectItem>
                  <SelectItem value="pcm">
                    {t("go2rtcStreams.ffmpeg.audioPcm")}
                  </SelectItem>
                  <SelectItem value="mp3">
                    {t("go2rtcStreams.ffmpeg.audioMp3")}
                  </SelectItem>
                  <SelectItem value="exclude">
                    {t("go2rtcStreams.ffmpeg.audioExclude")}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Hardware acceleration - only when transcoding video */}
          {isTranscodingVideo && (
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                {t("go2rtcStreams.ffmpeg.hardware")}
              </Label>
              <Select
                value={parsed.hardware}
                onValueChange={(v) =>
                  handleFfmpegOptionChange(
                    "hardware",
                    v as FfmpegHardwareOption,
                  )
                }
              >
                <SelectTrigger className="h-8">
                  {parsed.hardware === "auto"
                    ? t("go2rtcStreams.ffmpeg.hardwareAuto")
                    : t("go2rtcStreams.ffmpeg.hardwareNone")}
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="none">
                      {t("go2rtcStreams.ffmpeg.hardwareNone")}
                    </SelectItem>
                    <SelectItem value="auto">
                      {t("go2rtcStreams.ffmpeg.hardwareAuto")}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
