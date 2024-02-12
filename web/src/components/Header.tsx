import { Link } from "react-router-dom";
import Logo from "@/components/Logo";
import { LuMenu } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { ENV } from "@/env";
import { NavLink } from "react-router-dom";
import { navbarLinks } from "@/pages/site-navigation";
import SettingsNavItems from "./settings/SettingsNavItems";

type HeaderProps = {
  onToggleNavbar: () => void;
};

function HeaderNavigation() {
  return (
    <div className="hidden md:flex">
      {navbarLinks.map((item) => {
        let shouldRender = item.dev ? ENV !== "production" : true;
        return (
          shouldRender && (
            <NavLink
              key={item.id}
              to={item.url}
              className={({ isActive }) =>
                `my-2 py-3 px-4 text-muted-foreground flex flex-row items-center text-center rounded-lg gap-2 hover:bg-border ${
                  isActive ? "font-bold bg-popover text-popover-foreground" : ""
                }`
              }
            >
              <div className="text-sm">{item.title}</div>
            </NavLink>
          )
        );
      })}
    </div>
  );
}

function Header({ onToggleNavbar }: HeaderProps) {
  return (
    <div className="flex gap-10 lg:gap-20 justify-between pt-2 mb-2 border-b-[1px] px-4 items-center md:hidden">
      <div className="flex gap-4 items-center flex-shrink-0 m-1">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleNavbar}
        >
          <LuMenu />
        </Button>
        <Link to="/">
          <div className="flex flex-row items-center">
            <Logo className="w-10 mr-5" />
          </div>
        </Link>
        <HeaderNavigation />
      </div>
      <SettingsNavItems className="flex flex-shrink-0 md:gap-2" />
    </div>
  );
}

export default Header;
