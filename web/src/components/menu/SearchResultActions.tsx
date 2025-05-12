import { useState, ReactNode } from "react";
import { SearchResult } from "@/types/search";
import { FrigateConfig } from "@/types/frigateConfig";
import { baseUrl } from "@/api/baseUrl";
import { toast } from "sonner";
import axios from "axios";
import { LuCamera, LuDownload, LuTrash2 } from "react-icons/lu";
import { FiMoreVertical } from "react-icons/fi";
import { FaArrowsRotate } from "react-icons/fa6";
import { MdImageSearch } from "react-icons/md";
import FrigatePlusIcon from "@/components/icons/FrigatePlusIcon";
import { isMobileOnly } from "react-device-detect";
import { buttonVariants } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useSWR from "swr";

import { Trans, useTranslation } from "react-i18next";

type SearchResultActionsProps = {
  searchResult: SearchResult;
  findSimilar: () => void;
  refreshResults: () => void;
  showObjectLifecycle: () => void;
  showSnapshot: () => void;
  isContextMenu?: boolean;
  children?: ReactNode;
};

export default function SearchResultActions({
  searchResult,
  findSimilar,
  refreshResults,
  showObjectLifecycle,
  showSnapshot,
  isContextMenu = false,
  children,
}: SearchResultActionsProps) {
  const { t } = useTranslation(["views/explore"]);

  const { data: config } = useSWR<FrigateConfig>("config");

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = () => {
    axios
      .delete(`events/${searchResult.id}`)
      .then((resp) => {
        if (resp.status == 200) {
          toast.success(t("searchResult.deleteTrackedObject.toast.success"), {
            position: "top-center",
          });
          refreshResults();
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unknown error";
        toast.error(
          t("searchResult.deleteTrackedObject.toast.error", { errorMessage }),
          {
            position: "top-center",
          },
        );
      });
  };

  const MenuItem = isContextMenu ? ContextMenuItem : DropdownMenuItem;

  const menuItems = (
    <>
      {searchResult.has_clip && (
        <MenuItem aria-label={t("itemMenu.downloadVideo.aria")}>
          <a
            className="flex items-center"
            href={`${baseUrl}api/events/${searchResult.id}/clip.mp4`}
            download={`${searchResult.camera}_${searchResult.label}.mp4`}
          >
            <LuDownload className="mr-2 size-4" />
            <span>{t("itemMenu.downloadVideo.label")}</span>
          </a>
        </MenuItem>
      )}
      {searchResult.has_snapshot && (
        <MenuItem aria-label={t("itemMenu.downloadSnapshot.aria")}>
          <a
            className="flex items-center"
            href={`${baseUrl}api/events/${searchResult.id}/snapshot.jpg`}
            download={`${searchResult.camera}_${searchResult.label}.jpg`}
          >
            <LuCamera className="mr-2 size-4" />
            <span>{t("itemMenu.downloadSnapshot.label")}</span>
          </a>
        </MenuItem>
      )}
      {searchResult.data.type == "object" && (
        <MenuItem
          aria-label={t("itemMenu.viewObjectLifecycle.aria")}
          onClick={showObjectLifecycle}
        >
          <FaArrowsRotate className="mr-2 size-4" />
          <span>{t("itemMenu.viewObjectLifecycle.label")}</span>
        </MenuItem>
      )}
      {config?.semantic_search?.enabled && isContextMenu && (
        <MenuItem
          aria-label={t("itemMenu.findSimilar.aria")}
          onClick={findSimilar}
        >
          <MdImageSearch className="mr-2 size-4" />
          <span>{t("itemMenu.findSimilar.label")}</span>
        </MenuItem>
      )}
      {isMobileOnly &&
        config?.plus?.enabled &&
        searchResult.has_snapshot &&
        searchResult.end_time &&
        searchResult.data.type == "object" &&
        !searchResult.plus_id && (
          <MenuItem
            aria-label={t("itemMenu.submitToPlus.aria")}
            onClick={showSnapshot}
          >
            <FrigatePlusIcon className="mr-2 size-4 cursor-pointer text-primary" />
            <span>{t("itemMenu.submitToPlus.label")}</span>
          </MenuItem>
        )}
      <MenuItem
        aria-label={t("itemMenu.deleteTrackedObject.label")}
        onClick={() => setDeleteDialogOpen(true)}
      >
        <LuTrash2 className="mr-2 size-4" />
        <span>{t("button.delete", { ns: "common" })}</span>
      </MenuItem>
    </>
  );

  return (
    <>
      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={() => setDeleteDialogOpen(!deleteDialogOpen)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dialog.confirmDelete.title")}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            <Trans ns="views/explore">dialog.confirmDelete.desc</Trans>
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
      {isContextMenu ? (
        <ContextMenu>
          <ContextMenuTrigger>{children}</ContextMenuTrigger>
          <ContextMenuContent>{menuItems}</ContextMenuContent>
        </ContextMenu>
      ) : (
        <>
          {config?.semantic_search?.enabled &&
            searchResult.data.type == "object" && (
              <Tooltip>
                <TooltipTrigger>
                  <MdImageSearch
                    className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                    onClick={findSimilar}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {t("itemMenu.findSimilar.label")}
                </TooltipContent>
              </Tooltip>
            )}

          {!isMobileOnly &&
            config?.plus?.enabled &&
            searchResult.has_snapshot &&
            searchResult.end_time &&
            searchResult.data.type == "object" &&
            !searchResult.plus_id && (
              <Tooltip>
                <TooltipTrigger>
                  <FrigatePlusIcon
                    className="size-5 cursor-pointer text-primary-variant hover:text-primary"
                    onClick={showSnapshot}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {t("itemMenu.submitToPlus.label")}
                </TooltipContent>
              </Tooltip>
            )}

          <DropdownMenu>
            <DropdownMenuTrigger>
              <FiMoreVertical className="size-5 cursor-pointer text-primary-variant hover:text-primary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{menuItems}</DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </>
  );
}
