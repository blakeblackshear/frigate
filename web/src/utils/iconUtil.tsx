import {
  LuBox,
  LuCar,
  LuDog,
  LuLassoSelect,
  LuPersonStanding,
} from "react-icons/lu";

export function getIconForLabel(label: string, className?: string) {
  switch (label) {
    case "car":
      return <LuCar key={label} className={className} />;
    case "dog":
      return <LuDog key={label} className={className} />;
    case "package":
      return <LuBox key={label} className={className} />;
    case "person":
      return <LuPersonStanding key={label} className={className} />;
    default:
      return <LuLassoSelect key={label} className={className} />;
  }
}
