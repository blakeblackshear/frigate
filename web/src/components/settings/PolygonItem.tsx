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
import { toRGBColorString } from "@/utils/canvasUtil";
import { Polygon, PolygonType } from "@/types/canvas";
import { useState } from "react";

type PolygonItemProps = {
  polygon: Polygon;
  setAllPolygons: React.Dispatch<React.SetStateAction<Polygon[]>>;
  index: number;
  activePolygonIndex: number | undefined;
  hoveredPolygonIndex: number | null;
  setHoveredPolygonIndex: (index: number | null) => void;
  setActivePolygonIndex: (index: number | undefined) => void;
  setEditPane: (type: PolygonType) => void;
  handleCopyCoordinates: (index: number) => void;
};

export default function PolygonItem({
  polygon,
  setAllPolygons,
  index,
  activePolygonIndex,
  hoveredPolygonIndex,
  setHoveredPolygonIndex,
  setActivePolygonIndex,
  setEditPane,
  handleCopyCoordinates,
}: PolygonItemProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const polygonTypeIcons = {
    zone: FaDrawPolygon,
    motion_mask: FaObjectGroup,
    object_mask: BsPersonBoundingBox,
  };

  const PolygonItemIcon = polygon ? polygonTypeIcons[polygon.type] : undefined;

  const handleDelete = (index: number) => {
    setAllPolygons((oldPolygons) => {
      return oldPolygons.filter((_, i) => i !== index);
    });
    setActivePolygonIndex(undefined);
  };

  return (
    <div
      key={index}
      className="flex p-1 rounded-lg flex-row items-center justify-between mx-2 my-1.5 transition-background duration-100"
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
            className="size-5 mr-2"
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
            Are you sure you want to delete the {polygon.type.replace("_", " ")}{" "}
            <em>{polygon.name}</em>?
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(index)}>
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
              <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      {!isMobile && hoveredPolygonIndex === index && (
        <div className="flex flex-row gap-2 items-center">
          <div
            className="cursor-pointer size-[15px]"
            onClick={() => {
              setActivePolygonIndex(index);
              setEditPane(polygon.type);
            }}
          >
            <Tooltip>
              <TooltipTrigger>
                <LuPencil
                  className={`size-[15px] ${
                    hoveredPolygonIndex === index && "text-primary-variant"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
          </div>
          <div
            className="cursor-pointer size-[15px]"
            onClick={() => handleCopyCoordinates(index)}
          >
            <Tooltip>
              <TooltipTrigger>
                <LuCopy
                  className={`size-[15px] ${
                    hoveredPolygonIndex === index && "text-primary-variant"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent>Copy coordinates</TooltipContent>
            </Tooltip>
          </div>
          <div
            className="cursor-pointer size-[15px]"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Tooltip>
              <TooltipTrigger>
                <HiTrash
                  className={`size-[15px] ${
                    hoveredPolygonIndex === index &&
                    "text-primary-variant fill-primary-variant"
                  }`}
                />
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}
