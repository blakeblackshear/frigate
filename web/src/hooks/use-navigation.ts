import { ENV } from "@/env";
import { FrigateConfig } from "@/types/frigateConfig";
import { NavData } from "@/types/navigation";
import { useMemo } from "react";
import { isDesktop } from "react-device-detect";
import { LuConstruction, LuVideo, LuChartNoAxesCombined, LuSearch, LuShare, LuScanFace } from "react-icons/lu";
import useSWR from "swr";

export const ID_LIVE = 1;
export const ID_REVIEW = 2;
export const ID_EXPLORE = 3;
export const ID_EXPORT = 4;
export const ID_PLAYGROUND = 5;
export const ID_FACE_LIBRARY = 6;

export default function useNavigation(
  variant: "primary" | "secondary" = "primary",
) {
  const { data: config } = useSWR<FrigateConfig>("config", {
    revalidateOnFocus: false,
  });

  return useMemo(
    () =>
      [
        {
          id: ID_LIVE,
          variant,
          icon: LuVideo,
          title: "menu.live.title",
          url: "/",
        },
        {
          id: ID_REVIEW,
          variant,
          icon: LuChartNoAxesCombined,
          title: "menu.review",
          url: "/review",
        },
        {
          id: ID_EXPLORE,
          variant,
          icon: LuSearch,
          title: "menu.explore",
          url: "/explore",
        },
        {
          id: ID_EXPORT,
          variant,
          icon: LuShare,
          title: "menu.export",
          url: "/export",
        },
        {
          id: ID_PLAYGROUND,
          variant,
          icon: LuConstruction,
          title: "menu.uiPlayground",
          url: "/playground",
          enabled: ENV !== "production",
        },
        {
          id: ID_FACE_LIBRARY,
          variant,
          icon: LuScanFace,
          title: "menu.faceLibrary",
          url: "/faces",
          enabled: isDesktop && config?.face_recognition.enabled,
        },
      ] as NavData[],
    [config?.face_recognition?.enabled, variant],
  );
}
