import { ENV } from "@/env";
import { NavData } from "@/types/navigation";
import { useMemo } from "react";
import { FaCompactDisc, FaVideo } from "react-icons/fa";
import { IoSearch } from "react-icons/io5";
import { LuConstruction } from "react-icons/lu";
import { MdVideoLibrary } from "react-icons/md";

export const ID_LIVE = 1;
export const ID_REVIEW = 2;
export const ID_EXPLORE = 3;
export const ID_EXPORT = 4;
export const ID_PLAYGROUND = 5;

export default function useNavigation(
  variant: "primary" | "secondary" = "primary",
) {
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
      ] as NavData[],
    [variant],
  );
}
