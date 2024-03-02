import Logo from "../Logo";
import { navbarLinks } from "@/pages/site-navigation";
import SettingsNavItems from "../settings/SettingsNavItems";
import NavItem from "./NavItem";

function Sidebar() {
  return (
    <aside className="absolute w-[52px] z-10 left-o inset-y-0 overflow-y-auto scrollbar-hidden py-4 flex flex-col justify-between bg-primary">
      <span tabIndex={0} className="sr-only" />
      <div className="w-full flex flex-col gap-0 items-center">
        <Logo className="w-8 h-8 mb-6" />
        {navbarLinks.map((item) => (
          <NavItem
            className="mx-[10px] mb-6"
            key={item.id}
            Icon={item.icon}
            title={item.title}
            url={item.url}
            dev={item.dev}
          />
        ))}
      </div>
      <SettingsNavItems className="hidden md:flex flex-col items-center mb-8" />
    </aside>
  );
}

export default Sidebar;
