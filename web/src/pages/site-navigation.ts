import {
    LuConstruction,
    LuFileUp,
    LuFilm,
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
      icon: LuFilm,
      title: "History",
      url: "/history",
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