import {
  LuConstruction,
  LuFileUp,
  LuFlag,
  LuVideo,
} from "react-icons/lu";

export const navbarLinks = [
  {
    id: 1,
    icon: LuVideo,
    title: "Live",
    url: "/",
  },
  {
    id: 2,
    icon: LuFlag,
    title: "Events",
    url: "/events",
  },
  {
    id: 3,
    icon: LuFileUp,
    title: "Export",
    url: "/export",
  },
  {
    id: 4,
    icon: LuConstruction,
    title: "UI Playground",
    url: "/playground",
    dev: true,
  },
];
