import { IconType } from "react-icons";

export type NavData = {
  id: number;
  variant?: "primary" | "secondary";
  icon: IconType;
  title: string;
  url: string;
  enabled?: boolean;
};
