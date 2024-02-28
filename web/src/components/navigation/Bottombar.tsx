import { navbarLinks } from "@/pages/site-navigation";
import NavItem from "./NavItem";
import SettingsNavItems from "../settings/SettingsNavItems";

function Bottombar() {
  return (
    <div className="absolute h-16 inset-x-4 bottom-0 flex flex-row items-center justify-between">
      {navbarLinks.map((item) => (
        <NavItem
          className=""
          variant="secondary"
          key={item.id}
          Icon={item.icon}
          title={item.title}
          url={item.url}
          dev={item.dev}
        />
      ))}
      <SettingsNavItems className="flex flex-shrink-0 justify-between gap-4" />
    </div>
  );
}

//

export default Bottombar;
