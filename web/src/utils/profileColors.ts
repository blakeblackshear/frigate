import type { ProfileColor } from "@/types/profile";

const PROFILE_COLORS: ProfileColor[] = [
  {
    bg: "bg-pink-400",
    text: "text-pink-400",
    dot: "bg-pink-400",
    border: "border-pink-400",
    bgMuted: "bg-pink-400/20",
  },
  {
    bg: "bg-violet-500",
    text: "text-violet-500",
    dot: "bg-violet-500",
    border: "border-violet-500",
    bgMuted: "bg-violet-500/20",
  },
  {
    bg: "bg-lime-500",
    text: "text-lime-500",
    dot: "bg-lime-500",
    border: "border-lime-500",
    bgMuted: "bg-lime-500/20",
  },
  {
    bg: "bg-teal-400",
    text: "text-teal-400",
    dot: "bg-teal-400",
    border: "border-teal-400",
    bgMuted: "bg-teal-400/20",
  },
  {
    bg: "bg-sky-400",
    text: "text-sky-400",
    dot: "bg-sky-400",
    border: "border-sky-400",
    bgMuted: "bg-sky-400/20",
  },
  {
    bg: "bg-emerald-400",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    border: "border-emerald-400",
    bgMuted: "bg-emerald-400/20",
  },
  {
    bg: "bg-indigo-400",
    text: "text-indigo-400",
    dot: "bg-indigo-400",
    border: "border-indigo-400",
    bgMuted: "bg-indigo-400/20",
  },
  {
    bg: "bg-rose-400",
    text: "text-rose-400",
    dot: "bg-rose-400",
    border: "border-rose-400",
    bgMuted: "bg-rose-400/20",
  },
  {
    bg: "bg-cyan-300",
    text: "text-cyan-300",
    dot: "bg-cyan-300",
    border: "border-cyan-300",
    bgMuted: "bg-cyan-300/20",
  },
  {
    bg: "bg-purple-400",
    text: "text-purple-400",
    dot: "bg-purple-400",
    border: "border-purple-400",
    bgMuted: "bg-purple-400/20",
  },
  {
    bg: "bg-green-400",
    text: "text-green-400",
    dot: "bg-green-400",
    border: "border-green-400",
    bgMuted: "bg-green-400/20",
  },
  {
    bg: "bg-amber-400",
    text: "text-amber-400",
    dot: "bg-amber-400",
    border: "border-amber-400",
    bgMuted: "bg-amber-400/20",
  },
  {
    bg: "bg-slate-400",
    text: "text-slate-400",
    dot: "bg-slate-400",
    border: "border-slate-400",
    bgMuted: "bg-slate-400/20",
  },
  {
    bg: "bg-orange-300",
    text: "text-orange-300",
    dot: "bg-orange-300",
    border: "border-orange-300",
    bgMuted: "bg-orange-300/20",
  },
  {
    bg: "bg-blue-300",
    text: "text-blue-300",
    dot: "bg-blue-300",
    border: "border-blue-300",
    bgMuted: "bg-blue-300/20",
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
