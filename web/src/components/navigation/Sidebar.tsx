import Logo from "../Logo";
import NavItem from "./NavItem";
import { CameraGroupSelector } from "../filter/CameraGroupSelector";
import { useLocation } from "react-router-dom";
import GeneralSettings from "../menu/GeneralSettings";
import AccountSettings from "../menu/AccountSettings";
import useNavigation from "@/hooks/use-navigation";
import { baseUrl } from "@/api/baseUrl";
import { useMemo } from "react";

function Sidebar() {
  const location = useLocation();
  const basePath = useMemo(() => new URL(baseUrl).pathname, []);

  const navbarLinks = useNavigation();

  return (
    <aside className="scrollbar-container scrollbar-hidden absolute inset-y-0 left-0 z-10 flex w-[52px] flex-col justify-between overflow-y-auto border-r border-secondary-highlight bg-background_alt py-4">
      <span tabIndex={0} className="sr-only" />
      <div className="flex w-full flex-col items-center gap-0">
        <Logo className="mb-6 h-8 w-8" />
        {navbarLinks.map((item) => {
          const showCameraGroups =
            item.id == 1 &&
            (location.pathname === "/" || location.pathname === basePath);

          return (
            <div key={item.id}>
              <NavItem
                className={`mx-[10px] ${showCameraGroups ? "mb-2" : "mb-4"}`}
                item={item}
                Icon={item.icon}
              />
              {showCameraGroups && <CameraGroupSelector className="mb-4" />}
            </div>
          );
        })}
      </div>
      <div className="mb-8 flex flex-col items-center gap-4">
        <GeneralSettings />
        <AccountSettings />
      </div>
    </aside>
  );
}

export default Sidebar;
