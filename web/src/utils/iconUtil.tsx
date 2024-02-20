import { BsPersonWalking } from "react-icons/bs";
import { FaCarSide, FaCat, FaDog } from "react-icons/fa";
import { LuBox, LuLassoSelect } from "react-icons/lu";

export function getIconForLabel(label: string, className?: string) {
  switch (label) {
    case "car":
      return <FaCarSide key={label} className={className} />;
    case "cat":
      return <FaCat key={label} className={className} />;
    case "dog":
      return <FaDog key={label} className={className} />;
    case "package":
      return <LuBox key={label} className={className} />;
    case "person":
      return <BsPersonWalking key={label} className={className} />;
    default:
      return <LuLassoSelect key={label} className={className} />;
  }
}
