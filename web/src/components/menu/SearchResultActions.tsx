import { useState, ReactNode } from "react";
import { SearchResult } from "@/types/search";
import { FrigateConfig } from "@/types/frigateConfig";
import { baseUrl } from "@/api/baseUrl";
import { toast } from "sonner";
import axios from "axios";
import { FiMoreVertical } from "react-icons/fi";
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
import useSWR from "swr";
import { Trans, useTranslation } from "react-i18next";
import BlurredIconButton from "../button/BlurredIconButton";
import { useIsAdmin } from "@/hooks/use-is-admin";

type SearchResultActionsProps = {
  searchResult: SearchResult;
  findSimilar: () => void;
  refreshResults: () => void;
  showTrackingDetails: () => void;
  addTrigger: () => void;
  isContextMenu?: boolean;
  children?: ReactNode;
};

export default function SearchResultActions({
  searchResult,
  findSimilar,
  refreshResults,
  showTrackingDetails,
  addTrigger,
  isContextMenu = false,
  children,
}: SearchResultActionsProps) {
  const { t } = useTranslation(["views/explore"]);
  const isAdmin = useIsAdmin();

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
            <span>{t("itemMenu.downloadSnapshot.label")}</span>
          </a>
        </MenuItem>
      )}
      {searchResult.has_snapshot &&
        config?.cameras[searchResult.camera].snapshots.clean_copy && (
          <MenuItem aria-label={t("itemMenu.downloadCleanSnapshot.aria")}>
            <a
              className="flex items-center"
              href={`${baseUrl}api/events/${searchResult.id}/snapshot-clean.webp`}
              download={`${searchResult.camera}_${searchResult.label}-clean.webp`}
            >
              <span>{t("itemMenu.downloadCleanSnapshot.label")}</span>
            </a>
          </MenuItem>
        )}
      {searchResult.data.type == "object" && (
        <MenuItem
          aria-label={t("itemMenu.viewTrackingDetails.aria")}
          onClick={showTrackingDetails}
        >
          <span>{t("itemMenu.viewTrackingDetails.label")}</span>
        </MenuItem>
      )}
      {config?.semantic_search?.enabled &&
        searchResult.data.type == "object" && (
          <MenuItem
            aria-label={t("itemMenu.findSimilar.aria")}
            onClick={findSimilar}
          >
            <span>{t("itemMenu.findSimilar.label")}</span>
          </MenuItem>
        )}
      {isAdmin &&
        config?.semantic_search?.enabled &&
        searchResult.data.type == "object" && (
          <MenuItem
            aria-label={t("itemMenu.addTrigger.aria")}
            onClick={addTrigger}
          >
            <span>{t("itemMenu.addTrigger.label")}</span>
          </MenuItem>
        )}
      {isAdmin && (
        <MenuItem
          aria-label={t("itemMenu.deleteTrackedObject.label")}
          onClick={() => setDeleteDialogOpen(true)}
        >
          <span>{t("button.delete", { ns: "common" })}</span>
        </MenuItem>
      )}
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
        <ContextMenu modal={false}>
          <ContextMenuTrigger>{children}</ContextMenuTrigger>
          <ContextMenuContent>{menuItems}</ContextMenuContent>
        </ContextMenu>
      ) : (
        <>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <BlurredIconButton aria-label={t("itemMenu.more.aria")}>
                <FiMoreVertical className="size-5" />
              </BlurredIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">{menuItems}</DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </>
  );
}
