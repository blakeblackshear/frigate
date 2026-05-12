import { useTranslation } from "react-i18next";
import { humanizeKey } from "@/components/config-form/theme/utils/i18n";

/**
 * Resolve a translated label for a config field path within a section, falling
 * back through reduced paths (dropping each intermediate segment in turn) so
 * dict-keyed paths like `filters.person.threshold` still surface a meaningful
 * label. Dropped segments are prepended as context (e.g. "Person · Threshold").
 *
 * Shared between override badges that need to render field labels (e.g.
 * CameraOverridesBadge, ProfileOverridesBadge).
 */
export function useOverrideFieldLabel(sectionPath: string) {
  const { t, i18n } = useTranslation([
    "config/global",
    "views/settings",
    "objects",
  ]);

  return (fieldPath: string): string => {
    if (!fieldPath) {
      const sectionKey = `${sectionPath}.label`;
      return i18n.exists(sectionKey, { ns: "config/global" })
        ? t(sectionKey, { ns: "config/global" })
        : humanizeKey(sectionPath);
    }

    const segments = fieldPath.split(".");

    const fullKey = `${sectionPath}.${fieldPath}.label`;
    if (i18n.exists(fullKey, { ns: "config/global" })) {
      return t(fullKey, { ns: "config/global" });
    }

    for (let i = 0; i < segments.length; i++) {
      const reduced = [...segments.slice(0, i), ...segments.slice(i + 1)].join(
        ".",
      );
      if (!reduced) continue;
      const reducedKey = `${sectionPath}.${reduced}.label`;
      if (i18n.exists(reducedKey, { ns: "config/global" })) {
        const resolvedLabel = t(reducedKey, { ns: "config/global" });
        const dropped = segments[i];
        const droppedLabel = i18n.exists(dropped, { ns: "objects" })
          ? t(dropped, { ns: "objects" })
          : humanizeKey(dropped);
        return `${droppedLabel} · ${resolvedLabel}`;
      }
    }

    return humanizeKey(segments[segments.length - 1]);
  };
}
