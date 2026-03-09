import type { ProfileColor } from "@/types/profile";

const PROFILE_COLORS: ProfileColor[] = [
  {
    bg: "bg-blue-500",
    text: "text-blue-500",
    dot: "bg-blue-500",
    bgMuted: "bg-blue-500/20",
  },
  {
    bg: "bg-emerald-500",
    text: "text-emerald-500",
    dot: "bg-emerald-500",
    bgMuted: "bg-emerald-500/20",
  },
  {
    bg: "bg-amber-500",
    text: "text-amber-500",
    dot: "bg-amber-500",
    bgMuted: "bg-amber-500/20",
  },
  {
    bg: "bg-purple-500",
    text: "text-purple-500",
    dot: "bg-purple-500",
    bgMuted: "bg-purple-500/20",
  },
  {
    bg: "bg-rose-500",
    text: "text-rose-500",
    dot: "bg-rose-500",
    bgMuted: "bg-rose-500/20",
  },
  {
    bg: "bg-cyan-500",
    text: "text-cyan-500",
    dot: "bg-cyan-500",
    bgMuted: "bg-cyan-500/20",
  },
  {
    bg: "bg-orange-500",
    text: "text-orange-500",
    dot: "bg-orange-500",
    bgMuted: "bg-orange-500/20",
  },
  {
    bg: "bg-teal-500",
    text: "text-teal-500",
    dot: "bg-teal-500",
    bgMuted: "bg-teal-500/20",
  },
];

/**
 * Get a deterministic color for a profile name.
 *
 * Colors are assigned based on sorted position among all profile names,
 * so the same profile always gets the same color regardless of context.
 */
export function getProfileColor(
  profileName: string,
  allProfileNames: string[],
): ProfileColor {
  const sorted = [...allProfileNames].sort();
  const index = sorted.indexOf(profileName);
  return PROFILE_COLORS[(index >= 0 ? index : 0) % PROFILE_COLORS.length];
}
