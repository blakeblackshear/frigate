import Logo from "@/components/Logo";
import { FaCompactDisc, FaVideo } from "react-icons/fa";
import { LuConstruction } from "react-icons/lu";
import { MdVideoLibrary } from "react-icons/md";

export const navbarLinks = [
  {
    id: 1,
    icon: FaVideo,
    title: "Live",
    url: "/",
  },
  {
    id: 2,
    icon: MdVideoLibrary,
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
