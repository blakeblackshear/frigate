import {
  LuConstruction,
  LuFileUp,
  LuFilm,
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
    icon: LuFilm,
    title: "History",
    url: "/history",
  },
  {
    id: 4,
    icon: LuFileUp,
    title: "Export",
    url: "/export",
  },
  {
    id: 5,
    icon: LuConstruction,
    title: "UI Playground",
    url: "/playground",
    dev: true,
  },
];
