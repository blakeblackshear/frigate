import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import cloneDeep from "lodash/cloneDeep";
import get from "lodash/get";
import isEqual from "lodash/isEqual";
import set from "lodash/set";
import { LuExternalLink } from "react-icons/lu";
import { MdCircle } from "react-icons/md";
import Heading from "@/components/ui/heading";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useDocDomain } from "@/hooks/use-doc-domain";
import { useCameraFriendlyName } from "@/hooks/use-camera-friendly-name";
import { resolveZoneName } from "@/hooks/use-zone-friendly-name";
import { getTranslatedLabel } from "@/utils/i18n";
import { formatList } from "@/utils/stringUtil";
import type { ConfigSectionData, JsonObject } from "@/types/configForm";
import type { SectionRendererProps } from "./registry";

const EMPTY_ZONES: string[] = [];

function getRequiredZones(
  formData: JsonObject | undefined,
  path: string,
): string[] {
  const value = get(formData, path);
  return Array.isArray(value) ? (value as string[]) : EMPTY_ZONES;
}

export default function CameraReviewClassification({
  formContext,
  selectedCamera,
}: SectionRendererProps) {
  const { t } = useTranslation(["views/settings", "common"]);
  const { getLocaleDocUrl } = useDocDomain();
  const cameraName = formContext?.cameraName ?? selectedCamera;
  const fullFormData = formContext?.formData as JsonObject | undefined;
  const baselineFormData = formContext?.baselineFormData as
    | JsonObject
    | undefined;
  const cameraConfig = formContext?.fullCameraConfig;

  const alertsZones = useMemo(
    () => getRequiredZones(fullFormData, "alerts.required_zones"),
    [fullFormData],
  );
  const detectionsZones = useMemo(
    () => getRequiredZones(fullFormData, "detections.required_zones"),
    [fullFormData],
  );

  // Track whether zones have been modified from baseline for label coloring
  const alertsZonesModified = useMemo(() => {
    if (!baselineFormData) return false;
    const baseline = getRequiredZones(
      baselineFormData,
      "alerts.required_zones",
    );
    return !isEqual(alertsZones, baseline);
  }, [alertsZones, baselineFormData]);

  const detectionsZonesModified = useMemo(() => {
    if (!baselineFormData) return false;
    const baseline = getRequiredZones(
      baselineFormData,
      "detections.required_zones",
    );
    return !isEqual(detectionsZones, baseline);
  }, [detectionsZones, baselineFormData]);

  const [selectDetections, setSelectDetections] = useState(
    detectionsZones.length > 0,
  );
  const previousCameraRef = useRef(cameraName);
  const isSynced = formContext?.hasChanges === false;

  useEffect(() => {
    const cameraChanged = previousCameraRef.current !== cameraName;
    if (cameraChanged) {
      previousCameraRef.current = cameraName;
    }

    if (cameraChanged || isSynced) {
      setSelectDetections(detectionsZones.length > 0);
    }
  }, [cameraName, detectionsZones.length, isSynced]);

  const zones = useMemo(() => {
    if (!cameraConfig) {
      return undefined;
    }
    return Object.entries(cameraConfig.zones).map(([name, zoneData]) => {
      const zone =
        zoneData as (typeof cameraConfig.zones)[keyof typeof cameraConfig.zones];
      return {
        camera: cameraConfig.name,
        name,
        friendly_name: cameraConfig.zones[name].friendly_name,
        objects: zone.objects,
        color: zone.color,
      };
    });
  }, [cameraConfig]);

  const alertsLabels = useMemo(() => {
    return cameraConfig?.review.alerts.labels
      ? formatList(
          cameraConfig.review.alerts.labels.map((label: string) =>
            getTranslatedLabel(
              label,
              cameraConfig?.audio?.listen?.includes(label) ? "audio" : "object",
            ),
          ),
        )
      : "";
  }, [cameraConfig]);

  const detectionsLabels = useMemo(() => {
    return cameraConfig?.review.detections.labels
      ? formatList(
          cameraConfig.review.detections.labels.map((label: string) =>
            getTranslatedLabel(
              label,
              cameraConfig?.audio?.listen?.includes(label) ? "audio" : "object",
            ),
          ),
        )
      : "";
  }, [cameraConfig]);

  const selectCameraName = useCameraFriendlyName(cameraName);

  const getZoneName = useCallback(
    (zoneId: string, camId?: string) =>
      resolveZoneName(formContext?.fullConfig, zoneId, camId),
    [formContext?.fullConfig],
  );

  const updateFormData = useCallback(
    (path: string, nextValue: string[]) => {
      if (!formContext?.onFormDataChange || !fullFormData) {
        return;
      }
      const nextData = cloneDeep(fullFormData) as JsonObject;
      set(nextData, path, nextValue);
      formContext.onFormDataChange(nextData as ConfigSectionData);
    },
    [formContext, fullFormData],
  );

  const handleZoneToggle = useCallback(
    (path: string, zoneName: string) => {
      const currentZones = getRequiredZones(fullFormData, path);
      const nextZones = currentZones.includes(zoneName)
        ? currentZones.filter((value) => value !== zoneName)
        : [...currentZones, zoneName];
      updateFormData(path, nextZones);
    },
    [fullFormData, updateFormData],
  );

  const handleDetectionsToggle = useCallback(
    (checked: boolean | string) => {
      const isChecked = checked === true;
      if (!isChecked) {
        updateFormData("detections.required_zones", []);
      }
      setSelectDetections(isChecked);
    },
    [updateFormData],
  );

  if (!cameraName || formContext?.level !== "camera") {
    return null;
  }

  return (
    <div className="mb-4 space-y-6">
      <Heading as="h4" className="my-2">
        <Trans ns="views/settings">
          cameraReview.reviewClassification.title
        </Trans>
      </Heading>

      <div className="max-w-6xl">
        <div className="mb-5 mt-2 flex max-w-5xl flex-col gap-2 text-sm text-primary-variant">
          <p>
            <Trans ns="views/settings">
              cameraReview.reviewClassification.desc
            </Trans>
          </p>
          <div className="flex items-center text-primary">
            <Link
              to={getLocaleDocUrl("configuration/review")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline"
            >
              {t("readTheDocumentation", { ns: "common" })}
              <LuExternalLink className="ml-2 inline-flex size-3" />
            </Link>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "w-full max-w-5xl space-y-0",
          zones && zones.length > 0 && "grid items-start gap-5 md:grid-cols-2",
        )}
      >
        <div>
          {zones && zones.length > 0 ? (
            <>
              <div className="mb-2">
                <Label
                  className={cn(
                    "flex flex-row items-center text-base",
                    alertsZonesModified && "text-danger",
                  )}
                >
                  <Trans ns="views/settings">cameraReview.review.alerts</Trans>
                  <MdCircle className="ml-3 size-2 text-severity_alert" />
                </Label>
                <div className="text-sm text-muted-foreground">
                  <Trans ns="views/settings">
                    cameraReview.reviewClassification.selectAlertsZones
                  </Trans>
                </div>
              </div>
              <div className="max-w-md rounded-lg bg-secondary p-4 md:max-w-full">
                {zones.map((zone) => (
                  <div
                    key={zone.name}
                    className="mb-3 flex flex-row items-center space-x-3 space-y-0 last:mb-0"
                  >
                    <Checkbox
                      className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
                      checked={alertsZones.includes(zone.name)}
                      onCheckedChange={() =>
                        handleZoneToggle("alerts.required_zones", zone.name)
                      }
                    />
                    <Label
                      className={cn(
                        "font-normal",
                        !zone.friendly_name && "smart-capitalize",
                      )}
                    >
                      {zone.friendly_name || zone.name}
                    </Label>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="font-normal text-destructive">
              <Trans ns="views/settings">
                cameraReview.reviewClassification.noDefinedZones
              </Trans>
            </div>
          )}

          <div className="mt-2 text-sm">
            {alertsZones.length > 0
              ? t("cameraReview.reviewClassification.zoneObjectAlertsTips", {
                  alertsLabels,
                  zone: formatList(
                    alertsZones.map((zone) => getZoneName(zone, cameraName)),
                  ),
                  cameraName: selectCameraName,
                })
              : t("cameraReview.reviewClassification.objectAlertsTips", {
                  alertsLabels,
                  cameraName: selectCameraName,
                })}
          </div>
        </div>

        <div>
          {zones && zones.length > 0 && (
            <>
              <div className="mb-2">
                <Label
                  className={cn(
                    "flex flex-row items-center text-base",
                    detectionsZonesModified && "text-danger",
                  )}
                >
                  <Trans ns="views/settings">
                    cameraReview.review.detections
                  </Trans>
                  <MdCircle className="ml-3 size-2 text-severity_detection" />
                </Label>
                {selectDetections && (
                  <div className="text-sm text-muted-foreground">
                    <Trans ns="views/settings">
                      cameraReview.reviewClassification.selectDetectionsZones
                    </Trans>
                  </div>
                )}
              </div>

              {selectDetections && (
                <div className="max-w-md rounded-lg bg-secondary p-4 md:max-w-full">
                  {zones.map((zone) => (
                    <div
                      key={zone.name}
                      className="mb-3 flex flex-row items-center space-x-3 space-y-0 last:mb-0"
                    >
                      <Checkbox
                        className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
                        checked={detectionsZones.includes(zone.name)}
                        onCheckedChange={() =>
                          handleZoneToggle(
                            "detections.required_zones",
                            zone.name,
                          )
                        }
                      />
                      <Label
                        className={cn(
                          "font-normal",
                          !zone.friendly_name && "smart-capitalize",
                        )}
                      >
                        {zone.friendly_name || zone.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              <div className="mb-0 mt-3 flex flex-row items-center gap-2">
                <Checkbox
                  id="select-detections"
                  className="size-5 text-white accent-white data-[state=checked]:bg-selected data-[state=checked]:text-white"
                  checked={selectDetections}
                  onCheckedChange={handleDetectionsToggle}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="select-detections"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    <Trans ns="views/settings">
                      cameraReview.reviewClassification.limitDetections
                    </Trans>
                  </label>
                </div>
              </div>
            </>
          )}

          <div className="mt-2 text-sm">
            {detectionsZones.length > 0 ? (
              !selectDetections ? (
                <Trans
                  i18nKey="cameraReview.reviewClassification.zoneObjectDetectionsTips.text"
                  values={{
                    detectionsLabels,
                    zone: formatList(
                      detectionsZones.map((zone) =>
                        getZoneName(zone, cameraName),
                      ),
                    ),
                    cameraName: selectCameraName,
                  }}
                  ns="views/settings"
                />
              ) : (
                <Trans
                  i18nKey="cameraReview.reviewClassification.zoneObjectDetectionsTips.notSelectDetections"
                  values={{
                    detectionsLabels,
                    zone: formatList(
                      detectionsZones.map((zone) =>
                        getZoneName(zone, cameraName),
                      ),
                    ),
                    cameraName: selectCameraName,
                  }}
                  ns="views/settings"
                />
              )
            ) : (
              <Trans
                i18nKey="cameraReview.reviewClassification.objectDetectionsTips"
                values={{
                  detectionsLabels,
                  cameraName: selectCameraName,
                }}
                ns="views/settings"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
