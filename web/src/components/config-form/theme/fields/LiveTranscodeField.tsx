import type { FieldPathList, FieldProps } from "@rjsf/utils";
import { useCallback, useMemo } from "react";
import get from "lodash/get";
import { useTranslation } from "react-i18next";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConfigFormContext } from "@/types/configForm";
import type {
  LiveTranscodeConfig,
  LiveTranscodeQuality,
} from "@/types/frigateConfig";
import {
  TRANSCODE_HEIGHTS,
  defaultTranscodeBitrate,
  reconcileTranscodeStreams,
} from "@/utils/liveTranscode";

const EMPTY_TRANSCODE: LiveTranscodeConfig = {
  enabled: false,
  source: null,
  qualities: [],
};

// presets plus a height set in yaml, minus heights other rows use
function heightOptions(current: number, used: number[]): number[] {
  return [...new Set([...TRANSCODE_HEIGHTS, current])]
    .filter((height) => height === current || !used.includes(height))
    .sort((a, b) => b - a);
}

export function LiveTranscodeField(props: FieldProps) {
  const { formData, onChange, idSchema, disabled, readonly } = props;
  const formContext = props.registry?.formContext as
    ConfigFormContext | undefined;
  const { t } = useTranslation(["views/settings"]);

  const transcode =
    (formData as LiveTranscodeConfig | undefined) ?? EMPTY_TRANSCODE;

  const emptyPath = useMemo(() => [] as FieldPathList, []);
  const fieldPath =
    (props as { fieldPathId?: { path?: FieldPathList } }).fieldPathId?.path ??
    emptyPath;

  const camera = formContext?.cameraName ?? "";
  const streams = useMemo(
    () => (formContext?.formData?.streams ?? {}) as Record<string, string>,
    [formContext?.formData?.streams],
  );
  const go2rtcStreams = useMemo(
    () => Object.keys(formContext?.fullConfig?.go2rtc?.streams ?? {}),
    [formContext?.fullConfig?.go2rtc?.streams],
  );
  const sources = useMemo(
    () =>
      [...new Set(Object.values(streams))].filter((name) =>
        go2rtcStreams.includes(name),
      ),
    [streams, go2rtcStreams],
  );

  const savedSource = get(formContext?.baselineFormData, [
    ...fieldPath,
    "source",
  ]) as string | null | undefined;

  const available = sources.length > 0;
  const locked = disabled || readonly || !available;
  const baseId = idSchema?.$id || "live_transcode";

  // the stream list follows the transcode config in the same form change
  const update = useCallback(
    (next: LiveTranscodeConfig) => {
      onChange(next, fieldPath);
      onChange(
        reconcileTranscodeStreams(camera, streams, next, go2rtcStreams),
        [...fieldPath.slice(0, -1), "streams"],
      );
    },
    [camera, fieldPath, go2rtcStreams, onChange, streams],
  );

  const updateQuality = useCallback(
    (index: number, quality: LiveTranscodeQuality) => {
      const qualities = [...transcode.qualities];
      qualities[index] = quality;
      update({ ...transcode, qualities });
    },
    [transcode, update],
  );

  const addQuality = useCallback(() => {
    const used = new Set(transcode.qualities.map((q) => q.height));
    const height = TRANSCODE_HEIGHTS.find((h) => !used.has(h));

    if (height === undefined) return;

    update({
      ...transcode,
      qualities: [
        ...transcode.qualities,
        { height, bitrate: defaultTranscodeBitrate(height) },
      ],
    });
  }, [transcode, update]);

  const removeQuality = useCallback(
    (index: number) =>
      update({
        ...transcode,
        qualities: transcode.qualities.filter((_, i) => i !== index),
      }),
    [transcode, update],
  );

  const usedHeights = transcode.qualities.map((q) => q.height);

  return (
    <Card className="w-full">
      <CardHeader className="p-4">
        <CardTitle className="text-sm">
          {t("configForm.liveTranscode.title")}
        </CardTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          {available
            ? t("configForm.liveTranscode.description")
            : t("configForm.liveTranscode.unavailable")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="flex items-center gap-3">
          <Switch
            id={`${baseId}-enabled`}
            checked={transcode.enabled}
            disabled={locked}
            onCheckedChange={(enabled) =>
              update({
                ...transcode,
                enabled,
                // pin the shown source so reordering streams can't change it;
                // turning off drops the pin
                source: enabled
                  ? (transcode.source ?? sources[0])
                  : savedSource,
              })
            }
          />
          <Label htmlFor={`${baseId}-enabled`}>
            {t("configForm.liveTranscode.enable")}
          </Label>
        </div>

        {transcode.enabled && available && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${baseId}-source`}>
                {t("configForm.liveTranscode.source")}
              </Label>
              <Select
                value={transcode.source ?? sources[0]}
                disabled={locked}
                onValueChange={(source) => update({ ...transcode, source })}
              >
                <SelectTrigger id={`${baseId}-source`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {transcode.qualities.map((quality, index) => (
              <div
                key={quality.height}
                className="grid grid-cols-12 items-end gap-2 rounded-md border p-3"
              >
                <div className="col-span-5 space-y-2">
                  <Label htmlFor={`${baseId}-${index}-height`}>
                    {t("configForm.liveTranscode.height")}
                  </Label>
                  <Select
                    value={String(quality.height)}
                    disabled={locked}
                    onValueChange={(value) =>
                      updateQuality(index, {
                        height: Number(value),
                        bitrate: defaultTranscodeBitrate(Number(value)),
                      })
                    }
                  >
                    <SelectTrigger id={`${baseId}-${index}-height`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {heightOptions(quality.height, usedHeights).map(
                        (height) => (
                          <SelectItem key={height} value={String(height)}>
                            {t("configForm.liveTranscode.heightOption", {
                              height,
                            })}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-5 space-y-2">
                  <Label htmlFor={`${baseId}-${index}-bitrate`}>
                    {t("configForm.liveTranscode.bitrate")}
                  </Label>
                  <Input
                    id={`${baseId}-${index}-bitrate`}
                    type="number"
                    min={64}
                    value={quality.bitrate}
                    disabled={locked}
                    onChange={(e) => {
                      // an empty input would save 0, which the backend rejects
                      if (e.target.value === "") return;

                      updateQuality(index, {
                        ...quality,
                        bitrate: Number(e.target.value),
                      });
                    }}
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={locked}
                    onClick={() => removeQuality(index)}
                    aria-label={t("configForm.liveTranscode.removeQuality")}
                    title={t("configForm.liveTranscode.removeQuality")}
                  >
                    <LuTrash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={
                locked || usedHeights.length >= TRANSCODE_HEIGHTS.length
              }
              onClick={addQuality}
            >
              <LuPlus className="h-4 w-4" />
              {t("configForm.liveTranscode.addQuality")}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default LiveTranscodeField;
