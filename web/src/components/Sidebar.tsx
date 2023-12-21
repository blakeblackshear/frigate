import { IconType } from "react-icons";
import {
  LuConstruction,
  LuFileUp,
  LuFilm,
  LuLayoutDashboard,
  LuVideo,
} from "react-icons/lu";
import { NavLink } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Logo from "./Logo";
import { ENV } from "@/env";

const navbarLinks = [
  {
    id: 1,
    icon: LuLayoutDashboard,
    title: "Dashboard",
    url: "/",
  },
  {
    id: 2,
    icon: LuVideo,
    title: "Live",
    url: "/live",
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

function Sidebar({
  sheetOpen,
  setSheetOpen,
}: {
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
}) {
  const sidebar = (
    <aside className="sticky top-0 overflow-y-auto scrollbar-hidden py-4 lg:pt-0 flex flex-col ml-1 lg:w-56 gap-0">
      {navbarLinks.map((item) => (
        <SidebarItem
          key={item.id}
          Icon={item.icon}
          title={item.title}
          url={item.url}
          dev={item.dev}
          onClick={() => setSheetOpen(false)}
        />
      ))}
    </aside>
  );

  return (
    <>
      <div className="hidden md:block">{sidebar}</div>

      <Sheet
        open={sheetOpen}
        modal={false}
        onOpenChange={() => setSheetOpen(false)}
      >
        <SheetContent side="left" className="w-[120px]">
          <div className="w-full flex flex-row justify-center">
            <div className="w-10">
              <Logo />
            </div>
          </div>
          {sidebar}
        </SheetContent>
      </Sheet>
    </>
  );
}

type SidebarItemProps = {
  Icon: IconType;
  title: string;
  url: string;
  dev?: boolean;
  onClick?: () => void;
};

function SidebarItem({ Icon, title, url, dev, onClick }: SidebarItemProps) {
  const shouldRender = dev ? ENV !== "production" : true;

  return (
    shouldRender && (
      <NavLink
        to={url}
        onClick={onClick}
        className={({ isActive }) =>
          `py-4 px-2 flex flex-col lg:flex-row items-center rounded-lg gap-2 lg:w-full hover:bg-border ${
            isActive ? "font-bold bg-popover text-popover-foreground" : ""
          }`
        }
      >
        <Icon className="w-6 h-6 mr-1" />
        <div className="text-sm text-center">{title}</div>
      </NavLink>
    )
  );
}

export default Sidebar;
