import { usePtzCommand } from "@/api/ws";
import { Button } from "@/components/ui/button";
import PtzPresetsDialog from "@/components/overlay/dialog/PtzPresetsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useKeyboardListener from "@/hooks/use-keyboard-listener";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { CameraPtzInfo, PtzPreset } from "@/types/ptz";
import React, { useCallback, useMemo, useState } from "react";
import { isMobile } from "react-device-detect";
import { BsThreeDotsVertical } from "react-icons/bs";
import {
  FaAngleDown,
  FaAngleLeft,
  FaAngleRight,
  FaAngleUp,
} from "react-icons/fa";
import { TbViewfinder } from "react-icons/tb";
import {
  MdCenterFocusStrong,
  MdCenterFocusWeak,
  MdHome,
  MdZoomIn,
  MdZoomOut,
} from "react-icons/md";
import useSWR from "swr";
import { cn } from "@/lib/utils";

import { useTranslation } from "react-i18next";
import TooltipButton from "@/views/button/TooltipButton";

export default function PtzControlPanel({
  className,
  camera,
  enabled,
  clickOverlay,
  setClickOverlay,
}: {
  className?: string;
  camera: string;
  enabled: boolean;
  clickOverlay: boolean;
  setClickOverlay: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { t } = useTranslation(["views/live"]);
  const { data: ptz } = useSWR<CameraPtzInfo>(
    enabled ? `${camera}/ptz/info` : null,
  );

  const { send: sendPtz } = usePtzCommand(camera);

  const isAdmin = useIsAdmin();
  const [managePresetsOpen, setManagePresetsOpen] = useState(false);

  // preset_details keeps the camera's original casing; older backends only
  // report the lowercase names
  const presets = useMemo<PtzPreset[]>(
    () =>
      ptz?.preset_details ??
      (ptz?.presets ?? []).map((name) => ({ token: name, name })),
    [ptz],
  );
  const canManagePresets =
    isAdmin &&
    !!ptz?.preset_details &&
    (ptz.features.includes("pt") || ptz.features.includes("zoom"));

  const onStop = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      sendPtz("STOP");
    },
    [sendPtz],
  );

  useKeyboardListener(
    [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "+",
      "-",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
    ],
    (key, modifiers) => {
      if (modifiers.repeat || !key) {
        return true;
      }

      if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(key)) {
        // keyup also reaches this listener, including from text inputs such
        // as the preset name field, so only recall presets on keydown
        if (!modifiers.down) {
          return true;
        }

        const presetNumber = parseInt(key);
        if (
          ptz &&
          (ptz.presets?.length ?? 0) > 0 &&
          presetNumber <= ptz.presets.length
        ) {
          sendPtz(`preset_${ptz.presets[presetNumber - 1]}`);
        }
        return true;
      }

      if (!modifiers.down) {
        sendPtz("STOP");
        return true;
      }

      switch (key) {
        case "ArrowLeft":
          sendPtz("MOVE_LEFT");
          return true;
        case "ArrowRight":
          sendPtz("MOVE_RIGHT");
          return true;
        case "ArrowUp":
          sendPtz("MOVE_UP");
          return true;
        case "ArrowDown":
          sendPtz("MOVE_DOWN");
          return true;
        case "+":
          sendPtz(modifiers.shift ? "FOCUS_IN" : "ZOOM_IN");
          return true;
        case "-":
          sendPtz(modifiers.shift ? "FOCUS_OUT" : "ZOOM_OUT");
          return true;
      }

      return false;
    },
  );

  return (
    <div
      className={cn(
        "absolute inset-x-2 bottom-[10%] flex select-none flex-wrap items-center justify-center gap-1 md:left-[50%] md:-translate-x-[50%] md:flex-nowrap",
        className ?? "",
        isMobile && "landscape:ml-12",
      )}
    >
      {ptz?.features?.includes("pt") && (
        <>
          <TooltipButton
            label={t("ptz.move.left.label")}
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("MOVE_LEFT");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("MOVE_LEFT");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <FaAngleLeft />
          </TooltipButton>
          <TooltipButton
            label={t("ptz.move.up.label")}
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("MOVE_UP");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("MOVE_UP");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <FaAngleUp />
          </TooltipButton>
          <TooltipButton
            label={t("ptz.move.down.label")}
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("MOVE_DOWN");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("MOVE_DOWN");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <FaAngleDown />
          </TooltipButton>
          <TooltipButton
            label={t("ptz.move.right.label")}
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("MOVE_RIGHT");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("MOVE_RIGHT");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <FaAngleRight />
          </TooltipButton>
        </>
      )}
      {ptz?.features?.includes("zoom") && (
        <>
          <TooltipButton
            label={t("ptz.zoom.in.label")}
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("ZOOM_IN");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("ZOOM_IN");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <MdZoomIn />
          </TooltipButton>
          <TooltipButton
            label={t("ptz.zoom.out.label")}
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("ZOOM_OUT");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("ZOOM_OUT");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <MdZoomOut />
          </TooltipButton>
        </>
      )}
      {ptz?.features?.includes("focus") && (
        <>
          <TooltipButton
            label={t("ptz.focus.in.label")}
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("FOCUS_IN");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("FOCUS_IN");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <MdCenterFocusStrong />
          </TooltipButton>
          <TooltipButton
            label={t("ptz.focus.out.label")}
            onMouseDown={(e) => {
              e.preventDefault();
              sendPtz("FOCUS_OUT");
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              sendPtz("FOCUS_OUT");
            }}
            onMouseUp={onStop}
            onTouchEnd={onStop}
          >
            <MdCenterFocusWeak />
          </TooltipButton>
        </>
      )}

      {ptz?.features?.includes("home") && (
        <TooltipButton
          label={t("ptz.home.goto")}
          onClick={() => sendPtz("HOME")}
        >
          <MdHome />
        </TooltipButton>
      )}

      {ptz?.features?.includes("pt-r-fov") && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={`${clickOverlay ? "text-selected" : "text-primary"}`}
              aria-label={t("ptz.move.clickMove.label")}
              onClick={() => setClickOverlay(!clickOverlay)}
            >
              <TbViewfinder />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {clickOverlay
                ? t("ptz.move.clickMove.disable")
                : ptz?.features?.includes("zoom-r")
                  ? t("ptz.move.clickMove.enableWithZoom")
                  : t("ptz.move.clickMove.enable")}
            </p>
          </TooltipContent>
        </Tooltip>
      )}
      {(presets.length > 0 || canManagePresets) && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button aria-label={t("ptz.presets")}>
                  <BsThreeDotsVertical />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("ptz.presets")}</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent
            className="scrollbar-container max-h-[40dvh] overflow-y-auto"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {presets.map((preset) => (
              <DropdownMenuItem
                key={preset.token}
                aria-label={preset.name}
                className="cursor-pointer"
                onSelect={() => sendPtz(`preset_${preset.name}`)}
              >
                {preset.name}
              </DropdownMenuItem>
            ))}
            {canManagePresets && (
              <>
                {presets.length > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => setManagePresetsOpen(true)}
                >
                  {t("ptz.presetManagement.manage")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {canManagePresets && (
        <PtzPresetsDialog
          camera={camera}
          open={managePresetsOpen}
          setOpen={setManagePresetsOpen}
          presets={presets}
          maxPresets={ptz?.max_presets}
          canSetHome={ptz?.features?.includes("home-set") ?? false}
          onGoto={(preset) => sendPtz(`preset_${preset.name}`)}
        />
      )}
    </div>
  );
}
