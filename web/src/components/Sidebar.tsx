import { IconType } from "react-icons";
import { NavLink } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Logo from "./Logo";
import { ENV } from "@/env";
import { navbarLinks } from "@/pages/site-navigation";
import SettingsNavItems from "./settings/SettingsNavItems";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function Sidebar({
  sheetOpen,
  setSheetOpen,
}: {
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
}) {
  const sidebar = (
    <aside className="w-[52px] z-10 h-screen sticky top-0 overflow-y-auto scrollbar-hidden py-4 flex flex-col justify-between">
      <div className="w-full flex flex-col gap-0 items-center">
        <Logo className="w-8 h-8 mb-6" />
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
      </div>
      <SettingsNavItems className="hidden md:flex flex-col items-center" />
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
        <SheetContent side="left" className="w-[90px]">
          <div className="w-full flex flex-row justify-center"></div>
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
      <Tooltip>
        <NavLink
          to={url}
          onClick={onClick}
          className={({ isActive }) =>
            `mx-[10px] mb-6 flex flex-col justify-center items-center rounded-lg ${
              isActive
                ? "font-bold text-white bg-primary"
                : "text-muted-foreground bg-secondary"
            }`
          }
        >
          <TooltipTrigger>
            <Icon className="w-5 h-5 m-[6px]" />
          </TooltipTrigger>
        </NavLink>
        <TooltipContent side="right">
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    )
  );
}

export default Sidebar;
