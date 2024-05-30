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
import { isMobile } from "react-device-detect";
import {
  flattenPoints,
  parseCoordinates,
  toRGBColorString,
} from "@/utils/canvasUtil";
import { Polygon, PolygonType } from "@/types/canvas";
import { useCallback, useContext, useMemo, useState } from "react";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import useSWR from "swr";
import { FrigateConfig } from "@/types/frigateConfig";
import { reviewQueries } from "@/utils/zoneEdutUtil";
import IconWrapper from "../ui/icon-wrapper";
import { StatusBarMessagesContext } from "@/context/statusbar-provider";

type PolygonItemProps = {
  polygon: Polygon;
  index: number;
  hoveredPolygonIndex: number | null;
  setHoveredPolygonIndex: (index: number | null) => void;
  setActivePolygonIndex: (index: number | undefined) => void;
  setEditPane: (type: PolygonType) => void;
  handleCopyCoordinates: (index: number) => void;
};

export default function PolygonItem({
  polygon,
  index,
  hoveredPolygonIndex,
  setHoveredPolygonIndex,
  setActivePolygonIndex,
  setEditPane,
  handleCopyCoordinates,
}: PolygonItemProps) {
  const { data: config, mutate: updateConfig } =
    useSWR<FrigateConfig>("config");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { addMessage } = useContext(StatusBarMessagesContext)!;
  const [isLoading, setIsLoading] = useState(false);

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
      let url = "";
      if (polygon.type == "zone") {
        const { alertQueries, detectionQueries } = reviewQueries(
          polygon.name,
          false,
          false,
          polygon.camera,
          cameraConfig?.review.alerts.required_zones || [],
          cameraConfig?.review.detections.required_zones || [],
        );
        url = `cameras.${polygon.camera}.zones.${polygon.name}${alertQueries}${detectionQueries}`;
      }
      if (polygon.type == "motion_mask") {
        const filteredMask = (
          Array.isArray(cameraConfig.motion.mask)
            ? cameraConfig.motion.mask
            : [cameraConfig.motion.mask]
        ).filter((_, currentIndex) => currentIndex !== polygon.typeIndex);

        url = filteredMask
          .map((pointsArray) => {
            const coordinates = flattenPoints(
              parseCoordinates(pointsArray),
            ).join(",");
            return `cameras.${polygon?.camera}.motion.mask=${coordinates}&`;
          })
          .join("");

        if (!url) {
          // deleting last mask
          url = `cameras.${polygon?.camera}.motion.mask&`;
        }
      }

      if (polygon.type == "object_mask") {
        let configObject;
        let globalMask = false;

        // global mask on camera for all objects
        if (!polygon.objects.length) {
          configObject = cameraConfig.objects.mask;
          globalMask = true;
        } else {
          configObject = cameraConfig.objects.filters[polygon.objects[0]].mask;
        }

        if (!configObject) {
          return;
        }

        const globalObjectMasksArray = Array.isArray(cameraConfig.objects.mask)
          ? cameraConfig.objects.mask
          : cameraConfig.objects.mask
            ? [cameraConfig.objects.mask]
            : [];

        let filteredMask;
        if (globalMask) {
          filteredMask = (
            Array.isArray(configObject) ? configObject : [configObject]
          ).filter((_, currentIndex) => currentIndex !== polygon.typeIndex);
        } else {
          filteredMask = (
            Array.isArray(configObject) ? configObject : [configObject]
          )
            .filter((mask) => !globalObjectMasksArray.includes(mask))
            .filter((_, currentIndex) => currentIndex !== polygon.typeIndex);
        }

        url = filteredMask
          .map((pointsArray) => {
            const coordinates = flattenPoints(
              parseCoordinates(pointsArray),
            ).join(",");
            return globalMask
              ? `cameras.${polygon?.camera}.objects.mask=${coordinates}&`
              : `cameras.${polygon?.camera}.objects.filters.${polygon.objects[0]}.mask=${coordinates}&`;
          })
          .join("");

        if (!url) {
          // deleting last mask
          url = globalMask
            ? `cameras.${polygon?.camera}.objects.mask&`
            : `cameras.${polygon?.camera}.objects.filters.${polygon.objects[0]}.mask`;
        }
      }

      setIsLoading(true);

      await axios
        .put(`config/set?${url}`, { requires_restart: 0 })
        .then((res) => {
          if (res.status === 200) {
            toast.success(`${polygon?.name} has been deleted.`, {
              position: "top-center",
            });
            updateConfig();
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
    [updateConfig, cameraConfig],
  );

  const handleDelete = () => {
    setActivePolygonIndex(undefined);
    saveToConfig(polygon);
    addMessage(
      "masks_zones",
      "Restart required (masks/zones changed)",
      undefined,
      "masks_zones",
    );
  };

  return (
    <>
      <Toaster position="top-center" closeButton={true} />

      <div
        key={index}
        className="transition-background my-1.5 flex flex-row items-center justify-between rounded-lg p-1 duration-100"
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
          className={`flex items-center ${
            hoveredPolygonIndex === index
              ? "text-primary"
              : "text-primary-variant"
          }`}
        >
          {PolygonItemIcon && (
            <PolygonItemIcon
              className="mr-2 size-5"
              style={{
                fill: toRGBColorString(polygon.color, true),
                color: toRGBColorString(polygon.color, true),
              }}
            />
          )}
          <p className="cursor-default">{polygon.name}</p>
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
              Are you sure you want to delete the{" "}
              {polygon.type.replace("_", " ")} <em>{polygon.name}</em>?
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isMobile && (
          <>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger>
                <HiOutlineDotsVertical className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => {
                    setActivePolygonIndex(index);
                    setEditPane(polygon.type);
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopyCoordinates(index)}>
                  Copy
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isLoading}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        {!isMobile && hoveredPolygonIndex === index && (
          <div className="flex flex-row items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconWrapper
                  icon={LuPencil}
                  className={`size-[15px] cursor-pointer ${hoveredPolygonIndex === index && "text-primary-variant"}`}
                  onClick={() => {
                    setActivePolygonIndex(index);
                    setEditPane(polygon.type);
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconWrapper
                  icon={LuCopy}
                  className={`size-[15px] cursor-pointer ${
                    hoveredPolygonIndex === index && "text-primary-variant"
                  }`}
                  onClick={() => handleCopyCoordinates(index)}
                />
              </TooltipTrigger>
              <TooltipContent>Copy coordinates</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <IconWrapper
                  icon={HiTrash}
                  className={`size-[15px] cursor-pointer ${
                    hoveredPolygonIndex === index &&
                    "fill-primary-variant text-primary-variant"
                  }`}
                  onClick={() => !isLoading && setDeleteDialogOpen(true)}
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
