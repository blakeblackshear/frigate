import React, { useEffect, useMemo, useRef, useState } from "react";
import Translate, { translate } from "@docusaurus/Translate";
import { FaCompactDisc, FaVideo } from "react-icons/fa";
import { FaDrawPolygon, FaObjectGroup } from "react-icons/fa";
import { BsPersonBoundingBox } from "react-icons/bs";
import { IoSearch } from "react-icons/io5";
import { MdCategory, MdVideoLibrary } from "react-icons/md";
import { TbFaceId } from "react-icons/tb";
import {
  LuActivity,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuExternalLink,
  LuGithub,
  LuInfo,
  LuLanguages,
  LuLifeBuoy,
  LuList,
  LuPause,
  LuPlay,
  LuPlus,
  LuRotateCw,
  LuSettings,
  LuSquarePen,
  LuSunMoon,
  LuTrash2,
} from "react-icons/lu";

import manifest from "./manifest.json";
import styles from "./styles.module.css";

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return translate({ id: "configMock.notSet", message: "Not set" });
  }
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
};

function MockControl({ field, value }) {
  const effectiveValue = value ?? field.default;

  if (field.widget === "switch") {
    return (
      <span
        className={`${styles.switch} ${effectiveValue ? styles.switchOn : ""}`}
        aria-hidden="true"
      >
        <span />
      </span>
    );
  }

  if (field.widget === "range") {
    const min = field.minimum ?? 0;
    const max = field.maximum ?? 100;
    const numericValue = Number(effectiveValue ?? min);
    const progress = Math.max(
      0,
      Math.min(100, ((numericValue - min) / (max - min)) * 100),
    );
    return (
      <div className={styles.rangeControl} aria-hidden="true">
        <div className={styles.rangeTrack}>
          <span style={{ width: `${progress}%` }} />
          <i style={{ left: `${progress}%` }} />
        </div>
        <span className={styles.rangeValue}>{formatValue(effectiveValue)}</span>
      </div>
    );
  }

  if (field.widget === "tags") {
    const values = Array.isArray(effectiveValue)
      ? effectiveValue
      : [effectiveValue];
    return (
      <div className={styles.tags} aria-hidden="true">
        {values.filter(Boolean).map((item) => (
          <span key={String(item)}>{String(item)}</span>
        ))}
      </div>
    );
  }

  return (
    <span className={styles.input} aria-hidden="true">
      {formatValue(effectiveValue)}
      {field.widget === "select" && (
        <span className={styles.chevron}>{"\u2304"}</span>
      )}
    </span>
  );
}

function normalizeStep(base, step) {
  return {
    level: step.level ?? base.level ?? "global",
    section: step.section ?? base.section,
    fields: step.fields ?? base.fields,
    values: { ...(base.values ?? {}), ...(step.values ?? {}) },
    focus: step.focus ?? base.focus,
    hint: step.hint ?? base.hint,
    label: step.label ?? base.label,
    cameraImage: step.cameraImage ?? base.cameraImage,
    title: step.title,
  };
}

function IconRail({ phase }) {
  return (
    <aside className={styles.iconRail} aria-hidden="true">
      {[
        ["video", FaVideo],
        ["review", MdVideoLibrary],
        ["search", IoSearch],
        ["explore", FaCompactDisc],
        ["faces", TbFaceId],
        ["classification", MdCategory],
      ].map(([key, Icon]) => (
        <span className={styles.railIcon} key={key}>
          <Icon />
        </span>
      ))}
      <span className={styles.railSpacer} />
      <span
        className={`${styles.railIcon} ${styles.settingsIcon} ${phase === "settings" ? styles.navigationTarget : ""}`}
      >
        <LuSettings />
      </span>
    </aside>
  );
}

function SettingsNavigation({ step }) {
  const navigationRef = useRef(null);
  const activeItemRef = useRef(null);
  const groups = manifest.navigation?.groups ?? [];
  const activeGroup = groups.find((group) =>
    group.items.some(
      (item) => item.section === step.section && item.level === step.level,
    ),
  );

  useEffect(() => {
    const navigation = navigationRef.current;
    if (!navigation) return undefined;

    if (step.guidePhase === "settings") {
      navigation.scrollTop = 0;
      return undefined;
    }
    if (step.guidePhase !== "menu" || !activeItemRef.current) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      const target = activeItemRef.current;
      if (!target) return;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      navigation.scrollTo({
        top:
          target.offsetTop -
          navigation.clientHeight / 2 +
          target.offsetHeight / 2,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [step.guidePhase, step.level, step.section]);

  return (
    <aside
      className={styles.settingsNav}
      aria-hidden="true"
      ref={navigationRef}
    >
      {groups.map((group) => {
        const expanded = group.key === activeGroup?.key;
        const singleItem = group.items.length === 1;
        if (singleItem) {
          return (
            <div className={styles.singleMenuItem} key={group.key}>
              {group.items[0].label}
            </div>
          );
        }

        return (
          <div className={styles.menuGroup} key={group.key}>
            <div
              className={`${styles.menuGroupLabel} ${expanded ? styles.menuGroupLabelActive : ""}`}
            >
              <span>{group.label}</span>
              <span>{expanded ? <LuChevronDown /> : <LuChevronRight />}</span>
            </div>
            {expanded && step.level === "camera" && (
              <div className={styles.cameraName}>
                <Translate id="configMock.exampleCamera">Front Door</Translate>
              </div>
            )}
            {expanded && (
              <div className={styles.menuItems}>
                {group.items.map((item) => {
                  const active =
                    item.section === step.section && item.level === step.level;
                  return (
                    <div
                      className={`${styles.menuItem} ${active ? styles.menuItemActive : ""} ${active && step.guidePhase === "menu" ? styles.navigationTarget : ""}`}
                      key={item.key}
                      ref={active ? activeItemRef : undefined}
                    >
                      <span>{item.label}</span>
                      {active && <i />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

function SystemMenu({ visible }) {
  const label = (id, message) => translate({ id, message });
  const groups = [
    {
      label: label("configMock.systemMenu.system", "System"),
      items: [
        [
          LuActivity,
          label("configMock.systemMenu.systemMetrics", "System metrics"),
        ],
        [LuList, label("configMock.systemMenu.systemLogs", "System logs")],
      ],
    },
    {
      label: label("configMock.systemMenu.configuration", "Configuration"),
      items: [
        [LuSettings, label("configMock.settings", "Settings"), true],
        [
          LuSquarePen,
          label(
            "configMock.systemMenu.configurationEditor",
            "Configuration Editor",
          ),
        ],
      ],
    },
    {
      label: label("configMock.systemMenu.appearance", "Appearance"),
      items: [
        [
          LuLanguages,
          label("configMock.systemMenu.languages", "Languages"),
          false,
          true,
        ],
        [
          LuSunMoon,
          label("configMock.systemMenu.darkMode", "Dark Mode"),
          false,
          true,
        ],
        [LuSunMoon, label("configMock.systemMenu.theme", "Theme"), false, true],
      ],
    },
    {
      label: label("configMock.systemMenu.help", "Help"),
      items: [
        [
          LuLifeBuoy,
          label("configMock.systemMenu.documentation", "Documentation"),
        ],
        [LuGithub, "GitHub"],
      ],
    },
  ];

  return (
    <div
      className={`${styles.systemMenu} ${visible ? styles.systemMenuVisible : ""}`}
      aria-hidden="true"
    >
      {groups.map((group) => (
        <div className={styles.systemMenuGroup} key={group.label}>
          <strong>{group.label}</strong>
          {group.items.map(([Icon, label, target, submenu]) => (
            <div
              className={`${styles.systemMenuItem} ${target ? styles.systemMenuTarget : ""}`}
              key={label}
            >
              <span>
                <Icon />
              </span>
              <b>{label}</b>
              {submenu && (
                <i>
                  <LuChevronRight />
                </i>
              )}
            </div>
          ))}
        </div>
      ))}
      <div className={styles.restartItem}>
        <span>
          <LuRotateCw />
        </span>
        <b>{label("configMock.systemMenu.restart", "Restart Frigate")}</b>
      </div>
    </div>
  );
}

function HintNavigation({ navigation }) {
  return (
    <div className={styles.fieldHintNavigation}>
      <button
        type="button"
        aria-label={translate({
          id: "configMock.previousStep",
          message: "Previous step",
        })}
        disabled={navigation.current === 0}
        onClick={navigation.previous}
      >
        <LuChevronLeft />
      </button>
      <span>
        {navigation.current + 1} / {navigation.total}
      </span>
      <button
        type="button"
        aria-label={translate({
          id: "configMock.nextStep",
          message: "Next step",
        })}
        disabled={navigation.current === navigation.total - 1}
        onClick={navigation.next}
      >
        <LuChevronRight />
      </button>
    </div>
  );
}

function FieldHint({ navigation, title, text }) {
  const hintRef = useRef(null);
  const [placement, setPlacement] = useState(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const hint = hintRef.current;
    const target = hint?.parentElement;
    const viewport = target?.closest(`.${styles.contentViewport}`);
    if (!hint || !target || !viewport) return undefined;

    const measure = () => {
      const targetRect = target.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      const hintHeight = hint.getBoundingClientRect().height;
      const spaceAbove = targetRect.top - viewportRect.top;
      const spaceBelow = viewportRect.bottom - targetRect.bottom;
      const requiredSpace = hintHeight + 18;

      if (spaceBelow >= requiredSpace) {
        setPlacement("below");
      } else if (spaceAbove >= requiredSpace) {
        setPlacement("above");
      } else {
        setPlacement("overlay");
      }
    };

    const initialFrame = window.requestAnimationFrame(measure);
    const settledTimer = window.setTimeout(measure, 200);
    const revealTimer = window.setTimeout(() => setRevealed(true), 240);
    viewport.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      window.clearTimeout(settledTimer);
      window.clearTimeout(revealTimer);
      viewport.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [text]);

  return (
    <aside
      className={`${styles.fieldHint} ${placement === "above" ? styles.fieldHintAbove : ""} ${placement === "overlay" ? styles.fieldHintOverlay : ""} ${placement && revealed ? styles.fieldHintReady : styles.fieldHintMeasuring}`}
      ref={hintRef}
    >
      <span className={styles.fieldHintIcon}>
        <LuInfo />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
        <HintNavigation navigation={navigation} />
      </div>
    </aside>
  );
}

function NavigationHint({ navigation, step }) {
  const hintRef = useRef(null);
  const [position, setPosition] = useState(null);
  const section = manifest.levels[step.level]?.[step.section];
  const text =
    step.guidePhase === "settings"
      ? translate({
          id: "configMock.navigation.openSettingsHint",
          message: "Open the system menu and select Settings.",
        })
      : translate(
          {
            id: "configMock.navigation.findSectionHint",
            message: "Select {section} from {group}.",
          },
          {
            section: section?.label ?? step.section,
            group:
              step.guideDetail ??
              translate({
                id: "configMock.settings",
                message: "Settings",
              }),
          },
        );

  useEffect(() => {
    const hint = hintRef.current;
    const container = hint?.closest(`.${styles.appBody}`);
    if (!hint || !container) return undefined;

    const measure = () => {
      const selector =
        step.guidePhase === "settings"
          ? `.${styles.systemMenuTarget}`
          : `.${styles.menuItem}.${styles.navigationTarget}`;
      const target = container.querySelector(selector);
      if (!target) return;

      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const hintRect = hint.getBoundingClientRect();
      const gap = 12;
      let left = targetRect.right - containerRect.left + gap;
      if (left + hintRect.width > containerRect.width - gap) {
        left = targetRect.left - containerRect.left - hintRect.width - gap;
      }
      const top = Math.max(
        gap,
        Math.min(
          containerRect.height - hintRect.height - gap,
          targetRect.top -
            containerRect.top +
            targetRect.height / 2 -
            hintRect.height / 2,
        ),
      );
      setPosition({ left, top });
    };

    const timer = window.setTimeout(measure, 240);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
    };
  }, [step.guidePhase, step.level, step.section]);

  return (
    <aside
      className={`${styles.fieldHint} ${styles.navigationHint} ${position ? styles.navigationHintReady : styles.fieldHintMeasuring}`}
      ref={hintRef}
      style={position ?? undefined}
    >
      <span className={styles.fieldHintIcon}>
        <LuInfo />
      </span>
      <div>
        <strong>{step.guideLabel}</strong>
        <p>{text}</p>
        <HintNavigation navigation={navigation} />
      </div>
    </aside>
  );
}

function ObjectFieldRow({ field, fieldKey, focusRef, navigation, step }) {
  const focused = step.guidePhase === "field" && step.focus === fieldKey;
  const objectValue = step.values[fieldKey] ?? field.default ?? {};
  const entries = Object.entries(objectValue);
  const displayedEntries = entries.length ? entries : [["", [""]]];

  return (
    <div
      className={`${styles.objectField} ${focused ? styles.focused : ""}`}
      ref={focused ? focusRef : undefined}
    >
      <div className={styles.objectFieldHeader}>
        <div className={styles.fieldCopy}>
          <strong>{field.label}</strong>
          {field.description && <p>{field.description}</p>}
        </div>
        {focused ? <LuChevronDown /> : <LuChevronRight />}
      </div>
      {focused && (
        <div className={styles.objectFieldContent} aria-hidden="true">
          {displayedEntries.map(([key, rawValues], entryIndex) => {
            const objectValues = Array.isArray(rawValues)
              ? rawValues
              : [JSON.stringify(rawValues)];
            return (
              <div className={styles.objectEntry} key={key || entryIndex}>
                <div className={styles.objectEntryHeader}>
                  <span className={styles.objectInput}>
                    {key ||
                      translate({
                        id: "configMock.knownPlates.namePlaceholder",
                        message: "e.g., Wife's Car",
                      })}
                  </span>
                  <span className={styles.objectDelete}>
                    <LuTrash2 />
                  </span>
                </div>
                <div className={styles.objectValues}>
                  {objectValues.map((item, valueIndex) => (
                    <span
                      className={styles.objectInput}
                      key={`${String(item)}-${valueIndex}`}
                    >
                      {item ||
                        translate({
                          id: "configMock.knownPlates.platePlaceholder",
                          message: "Plate number or regex",
                        })}
                    </span>
                  ))}
                  <span className={styles.objectAdd}>
                    <LuPlus />
                    <Translate id="configMock.add">Add</Translate>
                  </span>
                </div>
              </div>
            );
          })}
          <span className={styles.objectAdd}>
            <LuPlus />
            <Translate id="configMock.add">Add</Translate>
          </span>
        </div>
      )}
      {focused && (
        <FieldHint
          navigation={navigation}
          text={step.hint ?? step.guideLabel}
          title={field.label}
        />
      )}
    </div>
  );
}

function RulesFieldRow({ field, fieldKey, focusRef, navigation, step }) {
  const focused = step.guidePhase === "field" && step.focus === fieldKey;
  const rules = step.values[fieldKey] ?? field.default ?? [];

  return (
    <div
      className={`${styles.objectField} ${focused ? styles.focused : ""}`}
      ref={focused ? focusRef : undefined}
    >
      <div className={styles.objectFieldHeader}>
        <div className={styles.fieldCopy}>
          <strong>{field.label}</strong>
          {field.description && <p>{field.description}</p>}
        </div>
        {focused ? <LuChevronDown /> : <LuChevronRight />}
      </div>
      {focused && (
        <div className={styles.rulesContent} aria-hidden="true">
          <div className={styles.rulesHeader}>
            <span>
              <Translate id="configMock.replacementRules.pattern">
                Regex pattern
              </Translate>
            </span>
            <span>
              <Translate id="configMock.replacementRules.replacement">
                Replacement string
              </Translate>
            </span>
          </div>
          <div className={styles.rulesRows}>
            {rules.map((rule, index) => (
              <div className={styles.ruleRow} key={index}>
                <span className={styles.objectInput}>{rule.pattern}</span>
                <span className={styles.objectInput}>{rule.replacement}</span>
                <span className={styles.objectDelete}>
                  <LuTrash2 />
                </span>
              </div>
            ))}
          </div>
          <span className={styles.objectAdd}>
            <LuPlus />
            <Translate id="configMock.add">Add</Translate>
          </span>
        </div>
      )}
      {focused && (
        <FieldHint
          navigation={navigation}
          text={step.hint ?? step.guideLabel}
          title={field.label}
        />
      )}
    </div>
  );
}

const objectLabelOptions = [
  "bicycle",
  "bus",
  "car",
  "cat",
  "dog",
  "license_plate",
  "motorcycle",
  "person",
];

const reviewLabelOptions = [
  "bark",
  "bicycle",
  "bird",
  "car",
  "cat",
  "dog",
  "face",
  "fire_alarm",
  "license_plate",
  "motorcycle",
  "person",
];

const humanizeKey = (value) =>
  value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

function TrackFieldRow({ field, fieldKey, focusRef, navigation, step }) {
  const focused = step.guidePhase === "field" && step.focus === fieldKey;
  const selected = step.values[fieldKey] ?? field.default ?? [];
  const options = [...new Set([...objectLabelOptions, ...selected])].sort();

  return (
    <div
      className={`${styles.trackField} ${focused ? styles.focused : ""}`}
      ref={focused ? focusRef : undefined}
    >
      <div className={styles.fieldCopy}>
        <strong>{field.label}</strong>
      </div>
      <div className={styles.trackSummary}>
        <LuChevronDown />
        <span>
          {selected.length}{" "}
          <Translate id="configMock.objectLabels.selected">
            object types selected
          </Translate>
        </span>
      </div>
      <div className={styles.trackSelector} aria-hidden="true">
        <span className={styles.trackSearch}>
          <Translate id="configMock.search">Search...</Translate>
        </span>
        <div className={styles.trackOptions}>
          {options.map((option) => (
            <div className={styles.trackOption} key={option}>
              <span>{humanizeKey(option)}</span>
              <span
                className={`${styles.switch} ${selected.includes(option) ? styles.switchOn : ""}`}
              >
                <span />
              </span>
            </div>
          ))}
        </div>
      </div>
      {field.description && (
        <p className={styles.trackDescription}>{field.description}</p>
      )}
      {focused && (
        <FieldHint
          navigation={navigation}
          text={step.hint ?? step.guideLabel}
          title={field.label}
        />
      )}
    </div>
  );
}

function LabelSwitchesFieldRow({
  field,
  fieldKey,
  focusRef,
  navigation,
  step,
}) {
  const focused = step.guidePhase === "field" && step.focus === fieldKey;
  const selected = step.values[fieldKey] ?? field.default ?? [];
  const options = [...new Set([...reviewLabelOptions, ...selected])].sort();

  return (
    <div
      className={`${styles.labelSwitchesField} ${focused ? styles.focused : ""}`}
      ref={focused ? focusRef : undefined}
    >
      <div className={styles.fieldCopy}>
        <strong>{field.label}</strong>
      </div>
      <div className={styles.trackSummary}>
        <LuChevronDown />
        <span>
          {selected.length}{" "}
          <Translate id="configMock.labels.selected">labels selected</Translate>
        </span>
      </div>
      <div className={styles.labelSelector} aria-hidden="true">
        <div className={styles.trackOptions}>
          {options.map((option) => (
            <div className={styles.trackOption} key={option}>
              <span>{humanizeKey(option)}</span>
              <span
                className={`${styles.switch} ${selected.includes(option) ? styles.switchOn : ""}`}
              >
                <span />
              </span>
            </div>
          ))}
        </div>
        <span className={styles.customLabelInput}>
          <Translate id="configMock.labels.customPlaceholder">
            Add custom label...
          </Translate>
        </span>
      </div>
      {field.description && (
        <p className={styles.trackDescription}>{field.description}</p>
      )}
      {focused && (
        <FieldHint
          navigation={navigation}
          text={step.hint ?? step.guideLabel}
          title={field.label}
        />
      )}
    </div>
  );
}

function FiltersFieldRow({ field, fieldKey, focusRef, navigation, step }) {
  const focused = step.guidePhase === "field" && step.focus === fieldKey;
  const filters = step.values[fieldKey] ?? field.default ?? {};

  return (
    <div
      className={`${styles.objectField} ${focused ? styles.focused : ""}`}
      ref={focused ? focusRef : undefined}
    >
      <div className={styles.objectFieldHeader}>
        <div className={styles.fieldCopy}>
          <strong>{field.label}</strong>
          {field.description && <p>{field.description}</p>}
        </div>
        {focused ? <LuChevronDown /> : <LuChevronRight />}
      </div>
      {focused && (
        <div className={styles.filtersContent} aria-hidden="true">
          {Object.entries(filters).map(([label, values]) => (
            <div className={styles.filterCard} key={label}>
              <div className={styles.filterCardHeader}>
                <strong>{humanizeKey(label)}</strong>
                <LuChevronDown />
              </div>
              <div className={styles.filterSettings}>
                {Object.entries(values).map(([key, value]) => (
                  <div className={styles.filterSetting} key={key}>
                    <span>{humanizeKey(key)}</span>
                    <span className={styles.input}>{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {focused && (
        <FieldHint
          navigation={navigation}
          text={step.hint ?? step.guideLabel}
          title={field.label}
        />
      )}
    </div>
  );
}

function FieldRow({ fieldKey, field, navigation, step, focusRef }) {
  const focused = step.guidePhase === "field" && step.focus === fieldKey;
  const fieldValue = step.values[fieldKey] ?? field.default;
  if (
    ["alerts.labels", "detections.labels"].includes(fieldKey) &&
    Array.isArray(fieldValue)
  ) {
    return (
      <LabelSwitchesFieldRow
        field={field}
        fieldKey={fieldKey}
        focusRef={focusRef}
        navigation={navigation}
        step={step}
      />
    );
  }
  if (fieldKey === "track" && Array.isArray(fieldValue)) {
    return (
      <TrackFieldRow
        field={field}
        fieldKey={fieldKey}
        focusRef={focusRef}
        navigation={navigation}
        step={step}
      />
    );
  }
  if (fieldKey === "filters" && fieldValue && typeof fieldValue === "object") {
    return (
      <FiltersFieldRow
        field={field}
        fieldKey={fieldKey}
        focusRef={focusRef}
        navigation={navigation}
        step={step}
      />
    );
  }
  const isObjectArray =
    field.widget === "tags" &&
    Array.isArray(fieldValue) &&
    fieldValue.some((item) => item && typeof item === "object");
  if (isObjectArray) {
    return (
      <RulesFieldRow
        field={field}
        fieldKey={fieldKey}
        focusRef={focusRef}
        navigation={navigation}
        step={step}
      />
    );
  }
  if (field.widget === "object") {
    return (
      <ObjectFieldRow
        field={field}
        fieldKey={fieldKey}
        focusRef={focusRef}
        navigation={navigation}
        step={step}
      />
    );
  }
  return (
    <div
      className={`${styles.field} ${focused ? styles.focused : ""}`}
      ref={focused ? focusRef : undefined}
    >
      <div className={styles.fieldCopy}>
        <strong>{field.label}</strong>
        {field.description && <p>{field.description}</p>}
      </div>
      <MockControl field={field} value={step.values[fieldKey]} />
      {focused && (
        <FieldHint
          navigation={navigation}
          text={step.hint ?? step.guideLabel}
          title={field.label}
        />
      )}
    </div>
  );
}

function ReviewToggle({ enabled, label }) {
  return (
    <div className={styles.reviewToggle}>
      <span
        className={`${styles.switch} ${enabled ? styles.switchOn : ""}`}
        aria-hidden="true"
      >
        <span />
      </span>
      <strong>{label}</strong>
    </div>
  );
}

function ReviewSettingsLayout({ focusRef, navigation, section, step }) {
  const valueFor = (key) =>
    step.values[key] ?? section.fields[key]?.default ?? false;
  const defaultZones = ["Front Door", "Driveway", "Side Yard"];
  const configuredZones = [
    ...(Array.isArray(valueFor("alerts.required_zones"))
      ? valueFor("alerts.required_zones")
      : []),
    ...(Array.isArray(valueFor("detections.required_zones"))
      ? valueFor("detections.required_zones")
      : []),
  ];
  const zones = configuredZones.length
    ? [...new Set(configuredZones)]
    : defaultZones;
  const configGroups = [
    {
      title: translate({
        id: "configMock.review.alertsConfig",
        message: "Alerts config",
      }),
      fields: ["alerts.enabled", "alerts.labels"],
    },
    {
      title: translate({
        id: "configMock.review.detectionsConfig",
        message: "Detections config",
      }),
      fields: ["detections.enabled", "detections.labels"],
    },
  ];

  return (
    <div className={styles.reviewLayout}>
      <section className={styles.reviewRuntimeSection}>
        <h4>
          <Translate id="configMock.review.cameraSettings">
            Camera Review Settings
          </Translate>
        </h4>
        <ReviewToggle
          enabled={Boolean(valueFor("alerts.enabled"))}
          label={translate({
            id: "configMock.review.alerts",
            message: "Alerts",
          })}
        />
        <ReviewToggle
          enabled={Boolean(valueFor("detections.enabled"))}
          label={translate({
            id: "configMock.review.detections",
            message: "Detections",
          })}
        />
        <p>
          <Translate id="configMock.review.runtimeDescription">
            Temporarily enable or disable alerts and detections for this camera
            until Frigate restarts.
          </Translate>
        </p>
      </section>

      <section className={styles.reviewRuntimeSection}>
        <h4>
          <Translate id="configMock.review.genaiTitle">
            Generative AI Review Descriptions
          </Translate>
        </h4>
        <ReviewToggle
          enabled={Boolean(valueFor("genai.enabled"))}
          label={translate({
            id: "configMock.enabled",
            message: "Enabled",
          })}
        />
        <p>
          <Translate id="configMock.review.genaiDescription">
            Temporarily enable or disable Generative AI review descriptions for
            this camera until Frigate restarts.
          </Translate>
        </p>
      </section>

      <section className={styles.reviewClassification}>
        <h4>
          <Translate id="configMock.review.classificationTitle">
            Review Classification
          </Translate>
        </h4>
        <p>
          <Translate id="configMock.review.classificationDescription">
            Configure which zones classify review items as Alerts and
            Detections.
          </Translate>
        </p>
        <span className={styles.docsLink}>
          <Translate id="configMock.readDocumentation">
            Read the documentation
          </Translate>{" "}
          <LuExternalLink aria-hidden="true" />
        </span>
        <div className={styles.reviewClassificationGrid}>
          {[
            {
              fieldKey: "alerts.required_zones",
              label: translate({
                id: "configMock.review.alerts",
                message: "Alerts",
              }),
              description: translate({
                id: "configMock.review.selectAlertsZones",
                message: "Select zones for Alerts",
              }),
            },
            {
              fieldKey: "detections.required_zones",
              label: translate({
                id: "configMock.review.detections",
                message: "Detections",
              }),
              description: translate({
                id: "configMock.review.selectDetectionZones",
                message: "Select zones for Detections",
              }),
            },
          ].map(({ description, fieldKey, label }) => {
            const focused =
              step.guidePhase === "field" && step.focus === fieldKey;
            const selectedZones = Array.isArray(valueFor(fieldKey))
              ? valueFor(fieldKey)
              : [];

            return (
              <div
                className={`${styles.reviewZoneColumn} ${focused ? styles.focused : ""}`}
                key={fieldKey}
                ref={focused ? focusRef : undefined}
              >
                <strong>{label}</strong>
                <small>{description}</small>
                <div className={styles.reviewZones}>
                  {zones.map((zone) => (
                    <span key={zone}>
                      <i
                        className={
                          selectedZones.includes(zone)
                            ? styles.reviewCheckboxChecked
                            : ""
                        }
                      />
                      {zone}
                    </span>
                  ))}
                </div>
                {focused && (
                  <FieldHint
                    navigation={navigation}
                    text={step.hint ?? step.guideLabel}
                    title={section.fields[fieldKey]?.label ?? label}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {configGroups.map((group) => (
        <section className={styles.reviewConfigCard} key={group.title}>
          <div className={styles.reviewConfigHeader}>
            <div>
              <strong>{group.title}</strong>
              <small>
                <Translate id="configMock.review.configDescription">
                  Configure review generation and retention for this camera.
                </Translate>
              </small>
            </div>
            <LuChevronDown />
          </div>
          <div className={styles.fields}>
            {group.fields.map((key) => (
              <FieldRow
                field={section.fields[key]}
                fieldKey={key}
                focusRef={focusRef}
                key={key}
                navigation={navigation}
                step={step}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DetectorModelLayout({ focusRef, navigation, section, step }) {
  const detectors = step.values.detectors ?? {};
  const detectorLabels = [
    ...new Set(
      Object.values(detectors).map((detector) => {
        const type = detector.type ?? "cpu";
        return manifest.detectorTypes?.[type]?.label ?? humanizeKey(type);
      }),
    ),
  ];
  const detectorFocused =
    step.guidePhase === "field" && step.focus === "detectors";
  const modelFocused =
    step.guidePhase === "field" && step.focus === "custom_model";
  const orderedModelFields = section.order.filter((key) => section.fields[key]);
  const standardModelFields = orderedModelFields.filter(
    (key) => !section.fields[key].advanced,
  );
  const advancedModelFields = orderedModelFields.filter(
    (key) => section.fields[key].advanced,
  );

  return (
    <div className={styles.detectorModelLayout}>
      <section
        className={`${styles.detectorHardwareCard} ${detectorFocused ? styles.focused : ""}`}
        ref={detectorFocused ? focusRef : undefined}
      >
        <div className={styles.detectorCardHeader}>
          <div>
            <strong>
              <Translate id="configMock.detectors.hardware">
                Detector Hardware
              </Translate>
            </strong>
            <small>
              <Translate id="configMock.detectors.hardwareDescription">
                Configure the detector backend that runs object detection.
              </Translate>
            </small>
          </div>
          <LuChevronDown />
        </div>
        <div className={styles.detectorInstances}>
          {Object.entries(detectors).map(([name, detector]) => {
            const detectorType = detector.type ?? "cpu";
            const detectorMetadata = manifest.detectorTypes?.[detectorType];
            const detectorLabel =
              detectorMetadata?.label ?? humanizeKey(detectorType);
            const detectorFields = Object.entries(detector).filter(
              ([key]) => key !== "type",
            );
            return (
              <div className={styles.detectorInstance} key={name}>
                <div className={styles.detectorInstanceHeader}>
                  <LuChevronDown />
                  <div>
                    <strong>{detectorLabel}</strong>
                    <span>{name}</span>
                    {detectorMetadata?.description && (
                      <small>{detectorMetadata.description}</small>
                    )}
                  </div>
                  <LuTrash2 />
                </div>
                <div className={styles.detectorFields}>
                  <div>
                    <span>
                      <Translate id="configMock.detectors.id">ID</Translate>
                    </span>
                    <span className={styles.input}>{name}</span>
                  </div>
                  <div>
                    <span>
                      <Translate id="configMock.detectors.type">Type</Translate>
                    </span>
                    <span className={styles.input}>{detectorLabel}</span>
                  </div>
                </div>
                <div className={styles.detectorSpecificFields}>
                  {detectorFields.map(([key, value]) => {
                    const metadata = detectorMetadata?.fields?.[key];
                    const displayValue =
                      value === ""
                        ? ""
                        : value && typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value);
                    return (
                      <div className={styles.detectorSpecificField} key={key}>
                        <div>
                          <strong>{metadata?.label ?? humanizeKey(key)}</strong>
                          {metadata?.description && (
                            <small>{metadata.description}</small>
                          )}
                        </div>
                        <span className={styles.input}>{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
                <span className={styles.objectAdd}>
                  <LuPlus />
                  <Translate id="configMock.detectors.addCustomKey">
                    Add custom key
                  </Translate>
                </span>
              </div>
            );
          })}
          <div className={styles.detectorAddPanel}>
            <span>
              <Translate id="configMock.detectors.add">Add detector</Translate>
            </span>
            <div>
              <span className={styles.input}>
                <Translate id="configMock.detectors.type">Type</Translate>
              </span>
              <span className={styles.objectAdd}>
                <LuPlus />
                <Translate id="configMock.add">Add</Translate>
              </span>
            </div>
          </div>
        </div>
        {detectorFocused && (
          <FieldHint
            navigation={navigation}
            text={
              step.hint ??
              (detectorLabels.length
                ? translate(
                    {
                      id: "configMock.detectors.configureTypes",
                      message: "Configure the {detectors} detector hardware.",
                    },
                    { detectors: detectorLabels.join(", ") },
                  )
                : step.guideLabel)
            }
            title={translate({
              id: "configMock.detectors.hardware",
              message: "Detector Hardware",
            })}
          />
        )}
      </section>

      <section
        className={`${styles.detectorHardwareCard} ${modelFocused ? styles.focused : ""}`}
        ref={modelFocused ? focusRef : undefined}
      >
        <div className={styles.detectorCardHeader}>
          <div>
            <strong>
              <Translate id="configMock.detectors.model">
                Detection Model
              </Translate>
            </strong>
            <small>
              <Translate id="configMock.detectors.modelDescription">
                Configure the model and its input shape.
              </Translate>
            </small>
          </div>
          <LuChevronDown />
        </div>
        <div className={styles.detectorModelTabs}>
          <span>
            <Translate id="configMock.detectors.frigatePlus">
              Frigate+
            </Translate>
          </span>
          <strong>
            <Translate id="configMock.detectors.customModel">
              Custom Model
            </Translate>
          </strong>
        </div>
        <div className={styles.fields}>
          {standardModelFields.map((key) => (
            <FieldRow
              field={section.fields[key]}
              fieldKey={key}
              focusRef={focusRef}
              key={key}
              navigation={navigation}
              step={step}
            />
          ))}
        </div>
        <div className={styles.detectorAdvancedHeader}>
          <LuChevronDown />
          <span>
            <Translate id="configMock.advancedSettings">
              Advanced Settings
            </Translate>{" "}
            ({advancedModelFields.length})
          </span>
        </div>
        <div className={styles.detectorAdvancedFields}>
          {advancedModelFields.map((key) => (
            <FieldRow
              field={section.fields[key]}
              fieldKey={key}
              focusRef={focusRef}
              key={key}
              navigation={navigation}
              step={step}
            />
          ))}
        </div>
        {modelFocused && (
          <FieldHint
            navigation={navigation}
            text={step.hint ?? step.guideLabel}
            title={translate({
              id: "configMock.detectors.customModel",
              message: "Custom Model",
            })}
          />
        )}
      </section>
    </div>
  );
}

const maskZoneLabels = {
  zones: "Zones",
  "zone.add": "Add Zone",
  "zone.canvas": "Draw the zone",
  "zone.options": "Zone options",
  "zone.objects": "Objects",
  "zone.loitering_time": "Loitering Time",
  "zone.inertia": "Inertia",
  "zone.speed": "Speed Estimation",
  "zone.speed_threshold": "Speed Threshold",
  "zone.save": "Save",
  motionMasks: "Motion Mask",
  "motionMask.add": "New Motion Mask",
  "motionMask.canvas": "Draw the motion mask",
  "motionMask.options": "Motion mask options",
  objectMasks: "Object Masks",
  "objectMask.add": "New Object Mask",
  "objectMask.canvas": "Draw the object mask",
  "objectMask.options": "Object mask options",
  "objectMask.objects": "Objects",
};

function MaskZoneTarget({ children, focusRef, id, navigation, step }) {
  const focused = step.guidePhase === "field" && step.focus === id;

  return (
    <div
      className={`${styles.maskZoneTarget} ${focused ? styles.focused : ""}`}
      ref={focused ? focusRef : undefined}
    >
      {children}
      {focused && !step.maskZoneOverlay && (
        <FieldHint
          navigation={navigation}
          text={step.hint ?? step.guideLabel}
          title={step.label ?? maskZoneLabels[id] ?? humanizeKey(id)}
        />
      )}
    </div>
  );
}

function MaskZoneListSection({
  addFocus,
  focusRef,
  icon: Icon,
  items,
  navigation,
  sectionFocus,
  step,
  title,
}) {
  return (
    <MaskZoneTarget
      focusRef={focusRef}
      id={sectionFocus}
      navigation={navigation}
      step={step}
    >
      <section className={styles.maskZoneListSection}>
        <header>
          <strong>{title}</strong>
          <MaskZoneTarget
            focusRef={focusRef}
            id={addFocus}
            navigation={navigation}
            step={step}
          >
            <span className={styles.polygonAdd}>
              <LuPlus />
            </span>
          </MaskZoneTarget>
        </header>
        {items.map((item) => (
          <div className={styles.polygonListItem} key={item.name}>
            <Icon />
            <span>
              <b>{item.name}</b>
              <small>{item.points} points</small>
            </span>
            <span className={`${styles.switch} ${styles.switchOn}`}>
              <span />
            </span>
          </div>
        ))}
      </section>
    </MaskZoneTarget>
  );
}

function MaskZoneFormField({
  children,
  description,
  focusRef,
  id,
  label,
  navigation,
  step,
}) {
  return (
    <MaskZoneTarget
      focusRef={focusRef}
      id={id}
      navigation={navigation}
      step={step}
    >
      <div className={styles.polygonFormField}>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
        {children}
      </div>
    </MaskZoneTarget>
  );
}

function PolygonEditor({ focusRef, navigation, step, type }) {
  const isZone = type === "zone";
  const isMotionMask = type === "motionMask";
  const name = isZone
    ? "Driveway"
    : isMotionMask
      ? "Timestamp area"
      : "Roof area";
  const prefix = type;

  return (
    <div className={styles.polygonEditor}>
      <div className={styles.polygonEditorHeader}>
        <strong>
          {isZone
            ? "Edit Zone"
            : isMotionMask
              ? "Edit Motion Mask"
              : "Edit Object Mask"}
        </strong>
        <small>Click the image to draw a polygon.</small>
      </div>
      <MaskZoneTarget
        focusRef={focusRef}
        id={`${prefix}.options`}
        navigation={navigation}
        step={step}
      >
        <div className={styles.polygonForm}>
          <MaskZoneFormField
            focusRef={focusRef}
            id={`${prefix}.name`}
            label="Friendly name"
            navigation={navigation}
            step={step}
          >
            <span className={styles.polygonInput}>{name}</span>
          </MaskZoneFormField>
          <div className={styles.polygonToggleRow}>
            <strong>Enabled</strong>
            <span className={`${styles.switch} ${styles.switchOn}`}>
              <span />
            </span>
          </div>
          {isZone && (
            <>
              <MaskZoneFormField
                description="Object types that apply to this zone."
                focusRef={focusRef}
                id="zone.objects"
                label="Objects"
                navigation={navigation}
                step={step}
              >
                <span className={styles.polygonInput}>person, car</span>
              </MaskZoneFormField>
              <MaskZoneFormField
                focusRef={focusRef}
                id="zone.loitering_time"
                label="Loitering Time"
                navigation={navigation}
                step={step}
              >
                <span className={styles.polygonInput}>4</span>
              </MaskZoneFormField>
              <MaskZoneFormField
                focusRef={focusRef}
                id="zone.inertia"
                label="Inertia"
                navigation={navigation}
                step={step}
              >
                <span className={styles.polygonInput}>3</span>
              </MaskZoneFormField>
              <MaskZoneFormField
                description="Enter a distance for each edge of a four-point zone."
                focusRef={focusRef}
                id="zone.speed"
                label="Speed Estimation"
                navigation={navigation}
                step={step}
              >
                <div className={styles.distanceGrid}>
                  {["10", "12", "11", "13.5"].map((value, index) => (
                    <span className={styles.polygonInput} key={index}>
                      Line {String.fromCharCode(65 + index)}: {value}
                    </span>
                  ))}
                </div>
              </MaskZoneFormField>
              <MaskZoneFormField
                focusRef={focusRef}
                id="zone.speed_threshold"
                label="Speed Threshold (km/h)"
                navigation={navigation}
                step={step}
              >
                <span className={styles.polygonInput}>20</span>
              </MaskZoneFormField>
            </>
          )}
          {!isZone && !isMotionMask && (
            <MaskZoneFormField
              focusRef={focusRef}
              id="objectMask.objects"
              label="Objects"
              navigation={navigation}
              step={step}
            >
              <span className={styles.polygonInput}>person</span>
            </MaskZoneFormField>
          )}
        </div>
      </MaskZoneTarget>
      <MaskZoneTarget
        focusRef={focusRef}
        id="zone.save"
        navigation={navigation}
        step={step}
      >
        <div className={styles.polygonActions}>
          <span>Cancel</span>
          <b>Save</b>
        </div>
      </MaskZoneTarget>
    </div>
  );
}

function MasksAndZonesLayout({ focusRef, navigation, step }) {
  const focus = step.focus ?? "zones";
  const layoutStep = { ...step, maskZoneOverlay: true };
  const editorType =
    focus.startsWith("zone.") && focus !== "zone.add"
      ? "zone"
      : focus.startsWith("motionMask.") && focus !== "motionMask.add"
        ? "motionMask"
        : focus.startsWith("objectMask.") && focus !== "objectMask.add"
          ? "objectMask"
          : null;
  const polygonClass =
    editorType === "motionMask"
      ? styles.motionMaskPolygon
      : editorType === "objectMask"
        ? styles.objectMaskPolygon
        : styles.zonePolygon;

  useEffect(() => {
    if (step.guidePhase !== "field") return undefined;
    const timer = window.setTimeout(() => {
      const target = focusRef.current;
      const sidebar = target?.closest(`.${styles.polygonSidebar}`);
      if (!target || !sidebar) return;
      const sidebarRect = sidebar.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      if (
        targetRect.top >= sidebarRect.top + 12 &&
        targetRect.bottom <= sidebarRect.bottom - 12
      ) {
        return;
      }
      sidebar.scrollTo({
        top: Math.max(
          0,
          sidebar.scrollTop + targetRect.top - sidebarRect.top - 18,
        ),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }, 40);
    return () => window.clearTimeout(timer);
  }, [focusRef, step.focus, step.guidePhase]);

  return (
    <div className={styles.masksZonesLayout}>
      <aside className={styles.polygonSidebar}>
        {editorType ? (
          <PolygonEditor
            focusRef={focusRef}
            navigation={navigation}
            step={layoutStep}
            type={editorType}
          />
        ) : (
          <div className={styles.polygonLists}>
            <div className={styles.polygonPageTitle}>Masks / Zones</div>
            <MaskZoneListSection
              addFocus="zone.add"
              focusRef={focusRef}
              icon={FaDrawPolygon}
              items={[{ name: "Driveway", points: 4 }]}
              navigation={navigation}
              sectionFocus="zones"
              step={layoutStep}
              title="Zones"
            />
            <MaskZoneListSection
              addFocus="motionMask.add"
              focusRef={focusRef}
              icon={FaObjectGroup}
              items={[{ name: "Timestamp area", points: 4 }]}
              navigation={navigation}
              sectionFocus="motionMasks"
              step={layoutStep}
              title="Motion Mask"
            />
            <MaskZoneListSection
              addFocus="objectMask.add"
              focusRef={focusRef}
              icon={BsPersonBoundingBox}
              items={[{ name: "Roof area", points: 5 }]}
              navigation={navigation}
              sectionFocus="objectMasks"
              step={layoutStep}
              title="Object Masks"
            />
          </div>
        )}
      </aside>
      <MaskZoneTarget
        focusRef={focusRef}
        id={`${editorType}.canvas`}
        navigation={navigation}
        step={layoutStep}
      >
        <div className={styles.polygonCanvas}>
          <img
            alt=""
            loading="lazy"
            src={step.cameraImage ?? "/img/frigate-autotracking-example.gif"}
          />
          <svg aria-hidden="true" viewBox="0 0 640 360">
            <polygon
              className={polygonClass}
              points={
                editorType === "motionMask"
                  ? "15,16 625,16 625,78 15,78"
                  : editorType === "objectMask"
                    ? "400,75 560,82 600,205 470,235 380,165"
                    : "80,270 240,150 525,175 595,325"
              }
            />
            {editorType &&
              (editorType === "motionMask"
                ? [
                    [15, 16],
                    [625, 16],
                    [625, 78],
                    [15, 78],
                  ]
                : editorType === "objectMask"
                  ? [
                      [400, 75],
                      [560, 82],
                      [600, 205],
                      [470, 235],
                      [380, 165],
                    ]
                  : [
                      [80, 270],
                      [240, 150],
                      [525, 175],
                      [595, 325],
                    ]
              ).map(([x, y], index) => (
                <circle cx={x} cy={y} key={index} r="6" />
              ))}
          </svg>
          <div className={styles.canvasBadge}>Front Door</div>
          {editorType && (
            <div className={styles.canvasTools}>
              <span>Clear points</span>
              <span>Snap points</span>
            </div>
          )}
        </div>
      </MaskZoneTarget>
      {step.guidePhase === "field" && (
        <aside className={`${styles.fieldHint} ${styles.maskZoneHint}`}>
          <span className={styles.fieldHintIcon}>
            <LuInfo />
          </span>
          <div>
            <strong>
              {step.label ??
                maskZoneLabels[step.focus] ??
                humanizeKey(step.focus)}
            </strong>
            <p>{step.hint ?? step.guideLabel}</p>
            <HintNavigation navigation={navigation} />
          </div>
        </aside>
      )}
    </div>
  );
}

function SettingsContent({ navigation, step }) {
  const section = manifest.levels[step.level]?.[step.section];
  const viewportRef = useRef(null);
  const focusRef = useRef(null);
  const pageRef = useRef(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    const target = focusRef.current;
    if (!viewport) return undefined;

    const page = `${step.level}:${step.section}`;
    const pageChanged = pageRef.current !== page;
    pageRef.current = page;
    if (pageChanged || step.guidePhase !== "field") {
      viewport.scrollTop = 0;
    }
    if (step.guidePhase !== "field" || !target) return undefined;
    const timer = window.setTimeout(() => {
      const viewportRect = viewport.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const outsideViewport =
        targetRect.top < viewportRect.top + 24 ||
        targetRect.bottom > viewportRect.bottom - 24;
      if (!outsideViewport) return;

      const targetIsTall = targetRect.height > viewportRect.height - 48;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      viewport.scrollTo({
        top:
          viewport.scrollTop +
          targetRect.top -
          viewportRect.top -
          (targetIsTall
            ? 24
            : viewport.clientHeight / 2 - targetRect.height / 2),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }, 40);

    return () => window.clearTimeout(timer);
  }, [step]);

  if (step.section === "masksAndZones" && step.level === "camera") {
    return (
      <main className={styles.contentViewport} ref={viewportRef}>
        <MasksAndZonesLayout
          focusRef={focusRef}
          navigation={navigation}
          step={step}
        />
      </main>
    );
  }

  if (!section) return null;

  if (step.section === "model" && step.level === "global") {
    return (
      <main className={styles.contentViewport} ref={viewportRef}>
        <div className={styles.scene}>
          <div className={styles.sectionHeader}>
            <h3>
              <Translate id="configMock.detectors.pageTitle">
                Detectors and model
              </Translate>
            </h3>
            <p>
              <Translate id="configMock.detectors.pageDescription">
                Configure the detector backend and the model it uses.
              </Translate>
            </p>
          </div>
          <DetectorModelLayout
            focusRef={focusRef}
            navigation={navigation}
            section={section}
            step={step}
          />
        </div>
      </main>
    );
  }

  if (step.section === "review" && step.level === "camera") {
    return (
      <main className={styles.contentViewport} ref={viewportRef}>
        <div className={styles.scene}>
          <div className={styles.sectionHeader}>
            <h3>{step.title ?? section.label}</h3>
            {section.description && <p>{section.description}</p>}
            <span className={styles.docsLink}>
              <Translate id="configMock.readDocumentation">
                Read the documentation
              </Translate>{" "}
              <LuExternalLink aria-hidden="true" />
            </span>
          </div>
          <ReviewSettingsLayout
            focusRef={focusRef}
            navigation={navigation}
            section={section}
            step={step}
          />
        </div>
      </main>
    );
  }

  const orderedKeys = section.order.length
    ? section.order.filter((key) => section.fields[key])
    : Object.keys(section.fields);
  if (
    step.focus &&
    section.fields[step.focus] &&
    !orderedKeys.includes(step.focus)
  ) {
    orderedKeys.push(step.focus);
  }
  const advancedKeys = orderedKeys.filter(
    (key) => section.fields[key]?.advanced,
  );
  const standardKeys = orderedKeys.filter(
    (key) => !section.fields[key]?.advanced,
  );
  const groupByField = new Map();
  (section.groups ?? []).forEach((group) => {
    group.fields.forEach((key) => groupByField.set(key, group));
  });
  const renderedGroups = new Set();
  const panels = [];
  standardKeys.forEach((key) => {
    const group = groupByField.get(key);
    if (!group) {
      panels.push({ type: "field", key, fields: [key] });
      return;
    }
    if (renderedGroups.has(group.key)) return;
    renderedGroups.add(group.key);
    panels.push({
      type: "group",
      key: group.key,
      label: group.label,
      fields: group.fields.filter((fieldKey) =>
        standardKeys.includes(fieldKey),
      ),
    });
  });
  const focusIsAdvanced =
    step.guidePhase === "field" && advancedKeys.includes(step.focus);

  return (
    <main className={styles.contentViewport} ref={viewportRef}>
      <div className={styles.scene}>
        <div className={styles.sectionHeader}>
          <h3>{step.title ?? section.label}</h3>
          {section.description && <p>{section.description}</p>}
          {section.docs && (
            <span className={styles.docsLink}>
              <Translate id="configMock.readDocumentation">
                Read the documentation
              </Translate>{" "}
              <LuExternalLink aria-hidden="true" />
            </span>
          )}
        </div>
        <div className={styles.panels}>
          {panels.map((panel) =>
            panel.type === "group" ? (
              <section className={styles.group} key={panel.key}>
                <div className={styles.groupTitle}>{panel.label}</div>
                <div className={styles.fields}>
                  {panel.fields.map((key) => (
                    <FieldRow
                      fieldKey={key}
                      field={section.fields[key]}
                      focusRef={focusRef}
                      key={key}
                      navigation={navigation}
                      step={step}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <div className={styles.standaloneField} key={panel.key}>
                <FieldRow
                  fieldKey={panel.key}
                  field={section.fields[panel.key]}
                  focusRef={focusRef}
                  navigation={navigation}
                  step={step}
                />
              </div>
            ),
          )}
          {advancedKeys.length > 0 &&
            (focusIsAdvanced ? (
              <section className={styles.group} key="advanced">
                <div className={styles.groupTitle}>
                  <Translate id="configMock.advancedSettings">
                    Advanced settings
                  </Translate>{" "}
                  ({advancedKeys.length})
                </div>
                <div className={styles.fields}>
                  {advancedKeys.map((key) => (
                    <FieldRow
                      fieldKey={key}
                      field={section.fields[key]}
                      focusRef={focusRef}
                      key={key}
                      navigation={navigation}
                      step={step}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <div className={styles.advancedCollapsed}>
                <LuChevronRight aria-hidden="true" />{" "}
                <Translate id="configMock.advancedSettings">
                  Advanced settings
                </Translate>{" "}
                ({advancedKeys.length})
              </div>
            ))}
        </div>
      </div>
    </main>
  );
}

function FocusedSettings({ navigation, step }) {
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setCameraReady(true), 40);
    return () => window.clearTimeout(timer);
  }, []);

  const cameraClass = !cameraReady
    ? styles.cameraOverview
    : step.guidePhase === "settings"
      ? styles.cameraSettings
      : step.guidePhase === "menu"
        ? styles.cameraMenu
        : styles.cameraField;

  return (
    <div className={`${styles.appFrame} ${cameraClass}`}>
      <header className={styles.appHeader}>
        <div className={styles.logoCell}>
          <img src="/img/branding/logo-dark.svg" alt="" />
        </div>
        <div className={styles.settingsTitle}>
          <Translate id="configMock.settings">Settings</Translate>
        </div>
      </header>
      <div className={styles.appBody}>
        <IconRail phase={step.guidePhase} />
        <SettingsNavigation step={step} />
        <SettingsContent navigation={navigation} step={step} />
        <SystemMenu visible={cameraReady && step.guidePhase === "settings"} />
        {step.guidePhase !== "field" && (
          <NavigationHint
            key={`${step.guidePhase}-${step.level}-${step.section}`}
            navigation={navigation}
            step={step}
          />
        )}
      </div>
    </div>
  );
}

export default function FrigateConfigMock({
  autoPlay = true,
  showNavigationSteps = true,
  section,
  level,
  fields,
  values,
  focus,
  hint,
  label,
  cameraImage = "/img/frigate-autotracking-example.gif",
  targets,
  steps,
}) {
  const resolvedSteps = useMemo(() => {
    const base = {
      section,
      level: level ?? "global",
      fields,
      values,
      focus,
      hint,
      label,
      cameraImage,
    };
    if (targets?.length) {
      return targets.map((target) =>
        normalizeStep(base, {
          focus: typeof target === "string" ? target : target.field,
          hint: typeof target === "string" ? undefined : target.hint,
        }),
      );
    }
    return steps?.length
      ? steps.flatMap((step) => {
          const page = normalizeStep(base, step);
          if (!step.targets?.length) return [page];
          return step.targets.map((target) =>
            normalizeStep(page, {
              focus: typeof target === "string" ? target : target.field,
              hint: typeof target === "string" ? undefined : target.hint,
            }),
          );
        })
      : [base];
  }, [
    cameraImage,
    fields,
    focus,
    hint,
    label,
    level,
    section,
    steps,
    targets,
    values,
  ]);
  const guideSteps = useMemo(
    () =>
      resolvedSteps.flatMap((step, index) => {
        const sectionData = manifest.levels[step.level]?.[step.section];
        const navigationGroup = manifest.navigation?.groups.find((group) =>
          group.items.some(
            (item) =>
              item.section === step.section && item.level === step.level,
          ),
        );
        const navigationItem = navigationGroup?.items.find(
          (item) => item.section === step.section && item.level === step.level,
        );
        const fieldLabel =
          step.label ??
          maskZoneLabels[step.focus] ??
          sectionData?.fields?.[step.focus]?.label ??
          (step.focus ? humanizeKey(step.focus.split(".").at(-1)) : undefined);
        const previous = resolvedSteps[index - 1];
        const samePage =
          previous?.section === step.section && previous?.level === step.level;
        const stages = [];
        if (!samePage && showNavigationSteps) {
          if (index === 0) {
            stages.push({
              ...step,
              guidePhase: "settings",
              guideLabel: translate({
                id: "configMock.guide.openSettings",
                message: "Open Settings",
              }),
            });
          }
          stages.push({
            ...step,
            guidePhase: "menu",
            guideLabel: translate(
              {
                id: "configMock.guide.openSection",
                message: "Find {section}",
              },
              {
                section:
                  navigationItem?.label ?? sectionData?.label ?? step.section,
              },
            ),
            guideDetail: navigationGroup?.label,
          });
        }
        if (fieldLabel) {
          stages.push({
            ...step,
            guidePhase: "field",
            guideLabel:
              step.label ??
              translate(
                {
                  id: "configMock.guide.findField",
                  message: "Find {field}",
                },
                { field: fieldLabel },
              ),
          });
        }
        return stages;
      }),
    [resolvedSteps, showNavigationSteps],
  );
  const [activeStep, setActiveStep] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);
  const [isVisible, setIsVisible] = useState(false);
  const mockRef = useRef(null);
  const guideStepsRef = useRef(null);
  const activeGuideStepRef = useRef(null);
  const current = guideSteps[Math.min(activeStep, guideSteps.length - 1)];

  useEffect(() => {
    const mock = mockRef.current;
    if (!mock) return undefined;
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return undefined;
    }

    const observer = new window.IntersectionObserver(
      ([entry]) => setIsVisible(entry.intersectionRatio >= 0.35),
      { threshold: [0, 0.35] },
    );
    observer.observe(mock);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || !isVisible || activeStep >= guideSteps.length - 1) {
      return undefined;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    const timer = window.setTimeout(
      () => {
        setActiveStep((value) => Math.min(guideSteps.length - 1, value + 1));
      },
      current.guidePhase === "settings" ? 3400 : 2600,
    );
    return () => window.clearTimeout(timer);
  }, [activeStep, current.guidePhase, guideSteps.length, isVisible, playing]);

  useEffect(() => {
    if (activeStep >= guideSteps.length - 1) setPlaying(false);
  }, [activeStep, guideSteps.length]);

  useEffect(() => {
    const guide = guideStepsRef.current;
    const target = activeGuideStepRef.current;
    if (!guide || !target) return undefined;

    if (activeStep <= 1) {
      guide.scrollLeft = 0;
      return undefined;
    }

    const previous = guide.children[activeStep - 1];
    if (!previous) return undefined;
    const guideRect = guide.getBoundingClientRect();
    const previousRect = previous.getBoundingClientRect();
    const previousContentLeft =
      guide.scrollLeft + previousRect.left - guideRect.left;
    guide.scrollLeft = Math.max(0, previousContentLeft - 14);
    return undefined;
  }, [activeStep]);

  const selectStep = (index) => {
    setPlaying(false);
    setActiveStep(index);
  };
  const navigation = {
    current: activeStep,
    total: guideSteps.length,
    previous: () => selectStep(Math.max(0, activeStep - 1)),
    next: () => selectStep(Math.min(guideSteps.length - 1, activeStep + 1)),
  };

  return (
    <div className={styles.mock} ref={mockRef}>
      <div className={styles.guidePlayer}>
        <div className={styles.guideSteps} ref={guideStepsRef}>
          {guideSteps.map((step, index) => (
            <button
              className={`${styles.guideStep} ${index === activeStep ? styles.guideStepActive : ""} ${index < activeStep ? styles.guideStepComplete : ""}`}
              key={`${step.section}-${step.guidePhase}-${index}`}
              onClick={() => selectStep(index)}
              ref={index === activeStep ? activeGuideStepRef : undefined}
              type="button"
            >
              <span>{index + 1}</span>
              <small>{step.guideLabel}</small>
            </button>
          ))}
        </div>
        <div className={styles.stepBar}>
          <div className={styles.currentInstruction}>
            <span>
              <Translate id="configMock.step">Step</Translate> {activeStep + 1}{" "}
              / {guideSteps.length}
            </span>
            <strong>{current.guideLabel}</strong>
            {current.guideDetail && <small>{current.guideDetail}</small>}
          </div>
          <div className={styles.stepActions}>
            <button
              type="button"
              aria-label={translate({
                id: "configMock.previousStep",
                message: "Previous step",
              })}
              disabled={activeStep === 0}
              onClick={() => selectStep(Math.max(0, activeStep - 1))}
            >
              <LuChevronLeft />
            </button>
            <button
              type="button"
              aria-label={translate({
                id: playing ? "configMock.pause" : "configMock.play",
                message: playing ? "Pause steps" : "Play steps",
              })}
              onClick={() => {
                if (!playing && activeStep === guideSteps.length - 1) {
                  setActiveStep(0);
                }
                setPlaying((value) => !value);
              }}
            >
              {playing ? <LuPause /> : <LuPlay />}
            </button>
            <button
              type="button"
              aria-label={translate({
                id: "configMock.nextStep",
                message: "Next step",
              })}
              disabled={activeStep === guideSteps.length - 1}
              onClick={() =>
                selectStep(Math.min(guideSteps.length - 1, activeStep + 1))
              }
            >
              <LuChevronRight />
            </button>
          </div>
        </div>
      </div>
      <div className={styles.viewport}>
        <FocusedSettings navigation={navigation} step={current} />
      </div>
    </div>
  );
}
