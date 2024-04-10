import Logo from "@/components/Logo";
import { FaCompactDisc, FaVideo } from "react-icons/fa";
import { TbTimelineEventFilled } from "react-icons/tb";
import { LuConstruction } from "react-icons/lu";

export const navbarLinks = [
  {
    id: 1,
    icon: FaVideo,
    title: "Live",
    url: "/",
  },
  {
    id: 2,
    icon: TbTimelineEventFilled,
    title: "Review",
    url: "/review",
  },
  {
    id: 3,
    icon: FaCompactDisc,
    title: "Export",
    url: "/export",
  },
  {
    id: 5,
    icon: Logo,
    title: "Frigate+",
    url: "/plus",
  },
  {
    id: 4,
    icon: LuConstruction,
    title: "UI Playground",
    url: "/playground",
    dev: true,
  },
];
