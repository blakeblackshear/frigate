export const allSettingsViews = [
  "ui",
  "enrichments",
  "cameras",
  "masksAndZones",
  "motionTuner",
  "triggers",
  "debug",
  "users",
  "roles",
  "notifications",
  "frigateplus",
] as const;

export type SettingsType = (typeof allSettingsViews)[number];
