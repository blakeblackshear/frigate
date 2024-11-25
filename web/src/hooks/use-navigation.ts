import { ENV } from "@/env";
import { FrigateConfig } from "@/types/frigateConfig";
import { NavData } from "@/types/navigation";
import { useMemo } from "react";
import { isDesktop } from "react-device-detect";
import { FaCompactDisc, FaVideo } from "react-icons/fa";
import { IoSearch } from "react-icons/io5";
import { LuConstruction } from "react-icons/lu";
import { MdVideoLibrary } from "react-icons/md";
import { TbFaceId } from "react-icons/tb";
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
          icon: FaVideo,
          title: "Live",
          url: "/",
        },
        {
          id: ID_REVIEW,
          variant,
          icon: MdVideoLibrary,
          title: "Review",
          url: "/review",
        },
        {
          id: ID_EXPLORE,
          variant,
          icon: IoSearch,
          title: "Explore",
          url: "/explore",
        },
        {
          id: ID_EXPORT,
          variant,
          icon: FaCompactDisc,
          title: "Export",
          url: "/export",
        },
        {
          id: ID_PLAYGROUND,
          variant,
          icon: LuConstruction,
          title: "UI Playground",
          url: "/playground",
          enabled: ENV !== "production",
        },
        {
          id: ID_FACE_LIBRARY,
          variant,
          icon: TbFaceId,
          title: "Face Library",
          url: "/faces",
          enabled: isDesktop && config?.face_recognition.enabled,
        },
      ] as NavData[],
    [config?.face_recognition.enabled, variant],
  );
}
