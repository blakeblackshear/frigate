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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { LuCopy, LuPencil } from "react-icons/lu";
import { FaDrawPolygon, FaObjectGroup } from "react-icons/fa";
import { BsPersonBoundingBox } from "react-icons/bs";
import { HiOutlineDotsVertical, HiTrash } from "react-icons/hi";
import { isDesktop, isMobile } from "react-device-detect";
import { toRGBColorString } from "@/utils/canvasUtil";
import { Polygon, PolygonType } from "@/types/canvas";
import { useCallback, useMemo, useState } from "react";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { reviewQueries } from "@/utils/zoneEdutUtil";
import IconWrapper from "../ui/icon-wrapper";
import { buttonVariants } from "../ui/button";
import { Trans, useTranslation } from "react-i18next";
import ActivityIndicator from "../indicators/activity-indicator";
import { cn } from "@/lib/utils";
import { useMotionMaskState, useObjectMaskState, useZoneState } from "@/api/ws";

type PolygonItemProps = {
  polygon: Polygon;
  index: number;
  hoveredPolygonIndex: number | null;
  setHoveredPolygonIndex: (index: number | null) => void;
  setActivePolygonIndex: (index: number | undefined) => void;
  setEditPane: (type: PolygonType) => void;
  handleCopyCoordinates: (index: number) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingPolygonIndex: number | undefined;
  setLoadingPolygonIndex: (index: number | undefined) => void;
};

export default function PolygonItem({
  polygon,
  index,
  hoveredPolygonIndex,
  setHoveredPolygonIndex,
  setActivePolygonIndex,
  setEditPane,
  handleCopyCoordinates,
  isLoading,
  setIsLoading,
  loadingPolygonIndex,
  setLoadingPolygonIndex,
}: PolygonItemProps) {
  const { t } = useTranslation("views/settings");
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { payload: motionMaskState, send: sendMotionMaskState } =
    useMotionMaskState(polygon.camera, polygon.name);
  const { payload: objectMaskState, send: sendObjectMaskState } =
    useObjectMaskState(polygon.camera, polygon.name);
  const { payload: zoneState, send: sendZoneState } = useZoneState(
    polygon.camera,
    polygon.name,
  );
  const isPolygonEnabled = useMemo(() => {
    const wsState =
      polygon.type === "zone"
        ? zoneState
        : polygon.type === "motion_mask"
          ? motionMaskState
          : objectMaskState;
    const wsEnabled =
      wsState === "ON" ? true : wsState === "OFF" ? false : undefined;
    return wsEnabled ?? polygon.enabled ?? true;
  }, [
    polygon.enabled,
    polygon.type,
    zoneState,
    motionMaskState,
    objectMaskState,
  ]);

  const cameraConfig = useMemo(() => {
    if (polygon?.camera && config) {
      return config.cameras[polygon.camera];
    }
  }, [polygon, config]);

  const polygonTypeIcons = {
    zone: FaDrawPolygon,
    motion_mask: FaObjectGroup,
    object_mask: BsPersonBoundingBox,
  };

  const PolygonItemIcon = polygon ? polygonTypeIcons[polygon.type] : undefined;

  const saveToConfig = useCallback(
    async (polygon: Polygon) => {
      if (!polygon || !cameraConfig) {
        return;
      }

      const updateTopicType =
        polygon.type === "zone"
          ? "zones"
          : polygon.type === "motion_mask"
            ? "motion"
            : polygon.type === "object_mask"
              ? "objects"
              : polygon.type;

      setIsLoading(true);
      setLoadingPolygonIndex(index);

      if (polygon.type === "zone") {
        // Zones use query string format
        const { alertQueries, detectionQueries } = reviewQueries(
          polygon.name,
          false,
          false,
          polygon.camera,
          cameraConfig?.review.alerts.required_zones || [],
          cameraConfig?.review.detections.required_zones || [],
        );
        const url = `cameras.${polygon.camera}.zones.${polygon.name}${alertQueries}${detectionQueries}`;

        await axios
          .put(`config/set?${url}`, {
            requires_restart: 0,
            update_topic: `config/cameras/${polygon.camera}/${updateTopicType}`,
          })
          .then((res) => {
            if (res.status === 200) {
              toast.success(
                t("masksAndZones.form.polygonDrawing.delete.success", {
                  name: polygon?.friendly_name ?? polygon?.name,
                }),
                { position: "top-center" },
              );
              updateConfig();
            } else {
              toast.error(
                t("toast.save.error.title", {
                  ns: "common",
                  errorMessage: res.statusText,
                }),
                { position: "top-center" },
              );
            }
          })
          .catch((error) => {
            const errorMessage =
              error.response?.data?.message ||
              error.response?.data?.detail ||
              "Unknown error";
            toast.error(
              t("toast.save.error.title", { errorMessage, ns: "common" }),
              { position: "top-center" },
            );
          })
          .finally(() => {
            setIsLoading(false);
          });
        return;
      }

      // Motion masks and object masks use JSON body format
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let configUpdate: any = {};

      if (polygon.type === "motion_mask") {
        // Delete mask from motion.mask dict by setting it to undefined
        configUpdate = {
          cameras: {
            [polygon.camera]: {
              motion: {
                mask: {
                  [polygon.name]: null, // Setting to null will delete the key
                },
              },
            },
          },
        };
      }

      if (polygon.type === "object_mask") {
        // Determine if this is a global mask or object-specific mask
        const isGlobalMask = !polygon.objects.length;

        if (isGlobalMask) {
          configUpdate = {
            cameras: {
              [polygon.camera]: {
                objects: {
                  mask: {
                    [polygon.name]: null, // Setting to null will delete the key
                  },
                },
              },
            },
          };
        } else {
          configUpdate = {
            cameras: {
              [polygon.camera]: {
                objects: {
                  filters: {
                    [polygon.objects[0]]: {
                      mask: {
                        [polygon.name]: null, // Setting to null will delete the key
                      },
                    },
                  },
                },
              },
            },
          };
        }
      }

      await axios
        .put("config/set", {
          config_data: configUpdate,
          requires_restart: 0,
          update_topic: `config/cameras/${polygon.camera}/${updateTopicType}`,
        })
        .then((res) => {
          if (res.status === 200) {
            toast.success(
              t("masksAndZones.form.polygonDrawing.delete.success", {
                name: polygon?.friendly_name ?? polygon?.name,
              }),
              { position: "top-center" },
            );
            updateConfig();
          } else {
            toast.error(
              t("toast.save.error.title", {
                ns: "common",
                errorMessage: res.statusText,
              }),
              { position: "top-center" },
            );
          }
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.response?.data?.detail ||
            "Unknown error";
          toast.error(
            t("toast.save.error.title", { errorMessage, ns: "common" }),
            { position: "top-center" },
          );
        })
        .finally(() => {
          setIsLoading(false);
          setLoadingPolygonIndex(undefined);
        });
    },
    [
      updateConfig,
      cameraConfig,
      t,
      setIsLoading,
      index,
      setLoadingPolygonIndex,
    ],
  );

  const handleDelete = () => {
    setActivePolygonIndex(undefined);
    saveToConfig(polygon);
  };

  const handleToggleEnabled = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Prevent toggling if disabled in config
      if (polygon.enabled_in_config === false) {
        return;
      }
      if (!polygon) {
        return;
      }

      const isEnabled = isPolygonEnabled;
      const nextState = isEnabled ? "OFF" : "ON";

      if (polygon.type === "zone") {
        sendZoneState(nextState);
        return;
      }

      if (polygon.type === "motion_mask") {
        sendMotionMaskState(nextState);
        return;
      }

      if (polygon.type === "object_mask") {
        sendObjectMaskState(nextState);
      }
    },
    [
      isPolygonEnabled,
      polygon,
      sendZoneState,
      sendMotionMaskState,
      sendObjectMaskState,
    ],
  );

  return (
    <>
      <Toaster position="top-center" closeButton={true} />

      <div
        key={index}
        className="transition-background relative my-1.5 flex flex-row items-center justify-between rounded-lg p-1 duration-100"
        data-index={index}
        onMouseEnter={() => setHoveredPolygonIndex(index)}
        onMouseLeave={() => setHoveredPolygonIndex(null)}
        style={{
          backgroundColor:
            hoveredPolygonIndex === index
              ? toRGBColorString(polygon.color, false)
              : "",
        }}
      >
        <div
          className={`flex min-w-0 items-center ${
            hoveredPolygonIndex === index
              ? "text-primary"
              : "text-primary-variant"
          }`}
        >
          {PolygonItemIcon &&
            (isLoading && loadingPolygonIndex === index ? (
              <div className="mr-2">
                <ActivityIndicator className="size-5" />
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleToggleEnabled}
                    disabled={isLoading || polygon.enabled_in_config === false}
                    className="mr-2 shrink-0 cursor-pointer border-none bg-transparent p-0 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PolygonItemIcon
                      className="size-5"
                      style={{
                        fill: toRGBColorString(polygon.color, isPolygonEnabled),
                        color: toRGBColorString(
                          polygon.color,
                          isPolygonEnabled,
                        ),
                      }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {polygon.enabled_in_config === false
                    ? t("masksAndZones.disabledInConfig", {
                        ns: "views/settings",
                      })
                    : isPolygonEnabled
                      ? t("button.disable", { ns: "common" })
                      : t("button.enable", { ns: "common" })}
                </TooltipContent>
              </Tooltip>
            ))}
          <p
            className={cn(
              "cursor-default",
              !isPolygonEnabled && "opacity-60",
              polygon.enabled_in_config === false && "line-through",
            )}
          >
            {polygon.friendly_name ?? polygon.name}
            {!isPolygonEnabled && " (disabled)"}
          </p>
        </div>
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("masksAndZones.form.polygonDrawing.delete.title")}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription>
              <Trans
                ns="views/settings"
                values={{
                  type: t(
                    `masksAndZones.form.polygonDrawing.type.${polygon.type}`,
                    { ns: "views/settings" },
                  ),
                  name: polygon.friendly_name ?? polygon.name,
                }}
              >
                masksAndZones.form.polygonDrawing.delete.desc
              </Trans>
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("button.cancel", { ns: "common" })}
              </AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive" })}
                onClick={handleDelete}
              >
                {t("button.delete", { ns: "common" })}
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
              <DropdownMenuContent>
                <DropdownMenuItem
                  aria-label={t("button.edit", { ns: "common" })}
                  disabled={isLoading}
                  onClick={() => {
                    setActivePolygonIndex(index);
                    setEditPane(polygon.type);
                  }}
                >
                  {t("button.edit", { ns: "common" })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  aria-label={t("button.copy", { ns: "common" })}
                  disabled={isLoading}
                  onClick={() => handleCopyCoordinates(index)}
                >
                  {t("button.copy", { ns: "common" })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  aria-label={t("button.delete", { ns: "common" })}
                  disabled={isLoading}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {t("button.delete", { ns: "common" })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        {!isMobile && hoveredPolygonIndex === index && (
          <div
            className="absolute inset-y-0 right-0 flex flex-row items-center gap-2 rounded-r-lg pl-8 pr-1"
            style={{
              background:
                polygon.color.length === 3
                  ? `linear-gradient(to right, transparent 0%, rgba(${polygon.color[2]},${polygon.color[1]},${polygon.color[0]},0.85) 40%)`
                  : "linear-gradient(to right, transparent 0%, rgba(220,0,0,0.85) 40%)",
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <IconWrapper
                  icon={LuPencil}
                  disabled={isLoading}
                  className={cn(
                    "size-[15px] cursor-pointer",
                    hoveredPolygonIndex === index && "text-primary-variant",
                    isLoading && "cursor-not-allowed opacity-50",
                  )}
                  onClick={() => {
                    if (!isLoading) {
                      setActivePolygonIndex(index);
                      setEditPane(polygon.type);
                    }
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {t("button.edit", { ns: "common" })}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconWrapper
                  icon={LuCopy}
                  className={cn(
                    "size-[15px] cursor-pointer",
                    hoveredPolygonIndex === index && "text-primary-variant",
                    isLoading && "cursor-not-allowed opacity-50",
                  )}
                  onClick={() => {
                    if (!isLoading) {
                      handleCopyCoordinates(index);
                    }
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                {t("button.copyCoordinates", { ns: "common" })}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconWrapper
                  icon={HiTrash}
                  disabled={isLoading}
                  className={cn(
                    "size-[15px] cursor-pointer",
                    hoveredPolygonIndex === index &&
                      "fill-primary-variant text-primary-variant",
                    isLoading && "cursor-not-allowed opacity-50",
                  )}
                  onClick={() => !isLoading && setDeleteDialogOpen(true)}
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
