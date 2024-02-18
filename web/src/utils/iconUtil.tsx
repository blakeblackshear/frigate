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
      return <LuCar className={className} />;
    case "dog":
      return <LuDog className={className} />;
    case "package":
      return <LuBox className={className} />;
    case "person":
      return <LuPersonStanding className={className} />;
    default:
      return <LuLassoSelect className={className} />;
  }
}
