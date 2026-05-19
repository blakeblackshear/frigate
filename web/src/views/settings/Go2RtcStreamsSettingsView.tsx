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
  LuCirclePlus,
  LuSlidersHorizontal,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import Heading from "@/components/ui/heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  parseFfmpegBaseAndExtras,
  buildFfmpegUrl,
  toggleFfmpegMode,
  type FfmpegVideoOption,
  type FfmpegAudioOption,
  type FfmpegHardwareOption,
  type ParsedFfmpegUrl,
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
          <LuCirclePlus className="mr-2 size-4" />
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
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
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
            <div className="space-y-2 px-4 pb-4">
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
                <LuCirclePlus className="mr-2 size-4" />
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

  const rawBaseUrl = parsed.isFfmpeg
    ? [parsed.baseUrl, ...parsed.extraFragments].join("#")
    : url;
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
    parsed.isFfmpeg && parsed.videos.some((v) => v === "h264" || v === "h265");

  const handleBaseUrlChange = useCallback(
    (newInput: string) => {
      if (parsed.isFfmpeg) {
        const { baseUrl, extraFragments } = parseFfmpegBaseAndExtras(newInput);
        const newUrl = buildFfmpegUrl({ ...parsed, baseUrl, extraFragments });
        onUpdateUrl(streamName, urlIndex, newUrl);
      } else {
        onUpdateUrl(streamName, urlIndex, newInput);
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

  const persistFfmpeg = useCallback(
    (next: Partial<ParsedFfmpegUrl>) => {
      const merged = { ...parsed, ...next };
      // Hardware acceleration is meaningless without a transcoding video codec
      if (!merged.videos.some((v) => v === "h264" || v === "h265")) {
        merged.hardware = "none";
      }
      onUpdateUrl(streamName, urlIndex, buildFfmpegUrl(merged));
    },
    [parsed, streamName, urlIndex, onUpdateUrl],
  );

  const updateVideoAt = useCallback(
    (idx: number, value: FfmpegVideoOption) => {
      // Picking exclude on the primary row drops any existing fallbacks —
      // they have no meaning when the track is excluded entirely.
      const videos =
        idx === 0 && value === "exclude"
          ? ["exclude" as FfmpegVideoOption]
          : parsed.videos.map((v, i) => (i === idx ? value : v));
      persistFfmpeg({ videos });
    },
    [parsed.videos, persistFfmpeg],
  );

  const addVideo = useCallback(() => {
    persistFfmpeg({ videos: [...parsed.videos, "copy"] });
  }, [parsed.videos, persistFfmpeg]);

  const removeVideoAt = useCallback(
    (idx: number) => {
      persistFfmpeg({ videos: parsed.videos.filter((_, i) => i !== idx) });
    },
    [parsed.videos, persistFfmpeg],
  );

  const updateAudioAt = useCallback(
    (idx: number, value: FfmpegAudioOption) => {
      // Picking exclude on the primary row drops any existing fallbacks —
      // they have no meaning when the track is excluded entirely.
      const audios =
        idx === 0 && value === "exclude"
          ? ["exclude" as FfmpegAudioOption]
          : parsed.audios.map((a, i) => (i === idx ? value : a));
      persistFfmpeg({ audios });
    },
    [parsed.audios, persistFfmpeg],
  );

  const addAudio = useCallback(() => {
    persistFfmpeg({ audios: [...parsed.audios, "copy"] });
  }, [parsed.audios, persistFfmpeg]);

  const removeAudioAt = useCallback(
    (idx: number) => {
      persistFfmpeg({ audios: parsed.audios.filter((_, i) => i !== idx) });
    },
    [parsed.audios, persistFfmpeg],
  );

  const updateHardware = useCallback(
    (value: FfmpegHardwareOption) => {
      persistFfmpeg({ hardware: value });
    },
    [persistFfmpeg],
  );

  const videoLabels: Record<FfmpegVideoOption, string> = {
    copy: t("go2rtcStreams.ffmpeg.videoCopy"),
    h264: t("go2rtcStreams.ffmpeg.videoH264"),
    h265: t("go2rtcStreams.ffmpeg.videoH265"),
    exclude: t("go2rtcStreams.ffmpeg.videoExclude"),
  };
  const audioLabels: Record<FfmpegAudioOption, string> = {
    copy: t("go2rtcStreams.ffmpeg.audioCopy"),
    aac: t("go2rtcStreams.ffmpeg.audioAac"),
    opus: t("go2rtcStreams.ffmpeg.audioOpus"),
    pcmu: t("go2rtcStreams.ffmpeg.audioPcmu"),
    pcma: t("go2rtcStreams.ffmpeg.audioPcma"),
    pcm: t("go2rtcStreams.ffmpeg.audioPcm"),
    mp3: t("go2rtcStreams.ffmpeg.audioMp3"),
    exclude: t("go2rtcStreams.ffmpeg.audioExclude"),
  };
  const hardwareLabels: Record<FfmpegHardwareOption, string> = {
    none: t("go2rtcStreams.ffmpeg.hardwareNone"),
    auto: t("go2rtcStreams.ffmpeg.hardwareAuto"),
    vaapi: t("go2rtcStreams.ffmpeg.hardwareVaapi"),
    cuda: t("go2rtcStreams.ffmpeg.hardwareCuda"),
    v4l2m2m: t("go2rtcStreams.ffmpeg.hardwareV4l2m2m"),
    dxva2: t("go2rtcStreams.ffmpeg.hardwareDxva2"),
    videotoolbox: t("go2rtcStreams.ffmpeg.hardwareVideotoolbox"),
  };

  return (
    <div className="pb-4">
      <div className="flex flex-1 flex-row items-center justify-start text-sm text-primary-variant">
        {t("go2rtcStreams.streamNumber", { index: urlIndex + 1 })}
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
      <div className="space-y-4 rounded-lg bg-background p-4">
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
                {showCredentials || isFocused ? (
                  <LuEyeOff className="size-4" />
                ) : (
                  <LuEye className="size-4" />
                )}
              </Button>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={parsed.isFfmpeg ? "select" : "ghost"}
                size="sm"
                aria-pressed={parsed.isFfmpeg}
                aria-label={t("go2rtcStreams.ffmpeg.useFfmpegModule")}
                onClick={() => handleFfmpegToggle(!parsed.isFfmpeg)}
                className="size-8 p-0"
              >
                <LuSlidersHorizontal className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t("go2rtcStreams.ffmpeg.useFfmpegModule")}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* ffmpeg options */}
        {parsed.isFfmpeg && (
          <div
            className={cn(
              "grid grid-cols-1 gap-3 pl-4",
              isTranscodingVideo ? "sm:grid-cols-3" : "sm:grid-cols-2",
            )}
          >
            {/* Video — one row per #video= fragment */}
            <div className="space-y-2">
              <div className="flex h-7 items-center justify-start gap-2">
                <Label className="text-xs font-medium">
                  {t("go2rtcStreams.ffmpeg.video")}
                </Label>
                {parsed.videos[0] !== "exclude" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addVideo}
                    className="size-6 p-0 text-muted-foreground hover:text-primary"
                    aria-label={t("go2rtcStreams.ffmpeg.addVideoCodec")}
                  >
                    <LuCirclePlus className="size-4" />
                  </Button>
                )}
              </div>
              {parsed.videos.map((v, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <Select
                    value={v}
                    onValueChange={(next) =>
                      updateVideoAt(idx, next as FfmpegVideoOption)
                    }
                  >
                    <SelectTrigger className="h-8 flex-1">
                      {videoLabels[v] ?? v}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(Object.keys(videoLabels) as FfmpegVideoOption[])
                          // Exclude is only meaningful on the primary row.
                          .filter((opt) => idx === 0 || opt !== "exclude")
                          .map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {videoLabels[opt]}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {idx > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeVideoAt(idx)}
                      className="size-8 p-0 text-muted-foreground hover:text-primary"
                      aria-label={t("go2rtcStreams.ffmpeg.removeCodec")}
                    >
                      <LuX className="size-4" />
                    </Button>
                  ) : (
                    // Reserve the same horizontal slot so the primary Select
                    // doesn't stretch wider than fallback rows.
                    <div className="size-8 shrink-0" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>

            {/* Audio — one row per #audio= fragment */}
            <div className="space-y-2">
              <div className="flex h-7 items-center justify-start gap-2">
                <Label className="text-xs font-medium">
                  {t("go2rtcStreams.ffmpeg.audio")}
                </Label>
                {parsed.audios[0] !== "exclude" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addAudio}
                    className="size-6 p-0 text-muted-foreground hover:text-primary"
                    aria-label={t("go2rtcStreams.ffmpeg.addAudioCodec")}
                  >
                    <LuCirclePlus className="size-4" />
                  </Button>
                )}
              </div>
              {parsed.audios.map((a, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <Select
                    value={a}
                    onValueChange={(next) =>
                      updateAudioAt(idx, next as FfmpegAudioOption)
                    }
                  >
                    <SelectTrigger className="h-8 flex-1">
                      {audioLabels[a] ?? a}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {(Object.keys(audioLabels) as FfmpegAudioOption[])
                          // Exclude is only meaningful on the primary row.
                          .filter((opt) => idx === 0 || opt !== "exclude")
                          .map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {audioLabels[opt]}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {idx > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAudioAt(idx)}
                      className="size-8 p-0 text-muted-foreground hover:text-primary"
                      aria-label={t("go2rtcStreams.ffmpeg.removeCodec")}
                    >
                      <LuX className="size-4" />
                    </Button>
                  ) : (
                    <div className="size-8 shrink-0" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>

            {/* Hardware acceleration — only when transcoding video */}
            {isTranscodingVideo && (
              <div className="space-y-2">
                <div className="flex h-7 items-center">
                  <Label className="text-xs font-medium">
                    {t("go2rtcStreams.ffmpeg.hardware")}
                  </Label>
                </div>
                <Select
                  value={parsed.hardware}
                  onValueChange={(v) =>
                    updateHardware(v as FfmpegHardwareOption)
                  }
                >
                  <SelectTrigger className="h-8">
                    {hardwareLabels[parsed.hardware] ?? parsed.hardware}
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {(
                        Object.keys(hardwareLabels) as FfmpegHardwareOption[]
                      ).map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {hardwareLabels[opt]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
