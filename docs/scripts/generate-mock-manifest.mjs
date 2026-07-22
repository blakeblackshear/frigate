#!/usr/bin/env node

/** Build the compact field catalog used by documentation config mocks. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const schemaPath = path.join(
  repoRoot,
  "web/e2e/fixtures/mock-data/config-schema.json",
);
const localeRoot = path.join(repoRoot, "web/public/locales/en/config");
const sectionConfigRoot = path.join(
  repoRoot,
  "web/src/components/config-form/section-configs",
);
const settingsSourcePath = path.join(repoRoot, "web/src/pages/Settings.tsx");
const settingsLocalePath = path.join(
  repoRoot,
  "web/public/locales/en/views/settings.json",
);
const outputPath = path.join(
  repoRoot,
  "docs/src/components/FrigateConfigMock/manifest.json",
);

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const translations = {
  global: JSON.parse(
    fs.readFileSync(path.join(localeRoot, "global.json"), "utf8"),
  ),
  camera: JSON.parse(
    fs.readFileSync(path.join(localeRoot, "cameras.json"), "utf8"),
  ),
  groups: JSON.parse(
    fs.readFileSync(path.join(localeRoot, "groups.json"), "utf8"),
  ),
};
const settingsTranslations = JSON.parse(
  fs.readFileSync(settingsLocalePath, "utf8"),
);

function resolveNode(node) {
  if (!node || typeof node !== "object") return {};

  if (node.$ref) {
    const refName = node.$ref.split("/").at(-1);
    return {
      ...resolveNode(schema.$defs?.[refName]),
      ...node,
      $ref: undefined,
    };
  }

  const variants = node.anyOf ?? node.oneOf;
  if (Array.isArray(variants)) {
    const concrete = variants.find((variant) => variant.type !== "null");
    return {
      ...resolveNode(concrete),
      ...node,
      anyOf: undefined,
      oneOf: undefined,
    };
  }

  return node;
}

function translationAt(level, section, fieldPath) {
  let current = translations[level]?.[section];
  for (const segment of fieldPath) {
    if (!current || typeof current !== "object") return {};
    current = current[segment];
  }
  return current && typeof current === "object" ? current : {};
}

function inferWidget(node) {
  if (Array.isArray(node.enum)) return "select";
  if (node.type === "boolean") return "switch";
  if (
    ["integer", "number"].includes(node.type) &&
    node.minimum !== undefined &&
    (node.maximum !== undefined || node.exclusiveMaximum !== undefined)
  ) {
    return "range";
  }
  if (node.type === "integer" || node.type === "number") return "number";
  if (node.type === "array") return "tags";
  if (node.type === "object") return "object";
  return "text";
}

function extractArray(source, key) {
  const match = source.match(new RegExp(`${key}\\s*:\\s*\\[([\\s\\S]*?)\\]`));
  return match
    ? [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1])
    : [];
}

function extractObjectBlock(source, key) {
  const match = new RegExp(`\\b${key}\\s*:\\s*\\{`).exec(source);
  if (!match) return "";
  const start = source.indexOf("{", match.index);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (['"', "'", "`"].includes(character)) {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start + 1, index);
    }
  }
  return "";
}

function extractGroups(source) {
  const fieldGroups = {};
  const groupsBlock = extractObjectBlock(source, "fieldGroups");
  for (const match of groupsBlock.matchAll(/(\w+)\s*:\s*\[([\s\S]*?)\]/g)) {
    fieldGroups[match[1]] = [...match[2].matchAll(/["']([^"']+)["']/g)].map(
      (item) => item[1],
    );
  }
  return fieldGroups;
}

function loadSectionHints(section, level) {
  const configPath = path.join(sectionConfigRoot, `${section}.ts`);
  if (!fs.existsSync(configPath)) return {};
  const source = fs.readFileSync(configPath, "utf8");
  const base = extractObjectBlock(source, "base");
  const override = extractObjectBlock(source, level);
  const overrideHas = (key) => new RegExp(`\\b${key}\\s*:`).test(override);
  return {
    order: overrideHas("fieldOrder")
      ? extractArray(override, "fieldOrder")
      : extractArray(base, "fieldOrder"),
    hidden: [
      ...extractArray(base, "hiddenFields"),
      ...extractArray(override, "hiddenFields"),
    ],
    advanced: overrideHas("advancedFields")
      ? extractArray(override, "advancedFields")
      : extractArray(base, "advancedFields"),
    groups: overrideHas("fieldGroups")
      ? extractGroups(override)
      : extractGroups(base),
    docs: base.match(/sectionDocs\s*:\s*["']([^"']+)["']/)?.[1] ?? null,
  };
}

function groupLabel(level, section, group) {
  const domain = level === "camera" ? "cameras" : "global";
  return (
    translations.groups?.[section]?.[domain]?.[group] ??
    group.replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase())
  );
}

function collectFields(level, section, sectionNode, hints) {
  const fields = {};

  function visit(rawNode, fieldPath = []) {
    const node = resolveNode(rawNode);
    const properties = node.properties;
    if (properties && typeof properties === "object") {
      for (const [name, child] of Object.entries(properties)) {
        visit(child, [...fieldPath, name]);
      }
      return;
    }

    if (fieldPath.length === 0) return;
    const key = fieldPath.join(".");
    const localized = translationAt(level, section, fieldPath);
    fields[key] = {
      label: localized.label ?? node.title ?? fieldPath.at(-1),
      description: localized.description ?? node.description ?? "",
      widget: inferWidget(node),
      default: node.default ?? null,
      enum: node.enum ?? null,
      minimum: node.minimum ?? node.exclusiveMinimum ?? null,
      maximum: node.maximum ?? node.exclusiveMaximum ?? null,
      advanced: hints.advanced?.includes(key) ?? false,
    };
  }

  visit(sectionNode);
  return fields;
}

function buildLevel(level) {
  const rootProperties =
    level === "camera"
      ? resolveNode(schema.$defs.CameraConfig).properties
      : schema.properties;
  const result = {};

  for (const [section, rawNode] of Object.entries(rootProperties ?? {})) {
    const node = resolveNode(rawNode);
    if (!node.properties) continue;

    const hints = loadSectionHints(section, level);
    const hidden = new Set(hints.hidden ?? []);
    const fields = collectFields(level, section, node, hints);
    for (const key of hidden) delete fields[key];

    const localized = translations[level]?.[section] ?? {};
    result[section] = {
      label: localized.label ?? rawNode.title ?? node.title ?? section,
      description: localized.description ?? rawNode.description ?? "",
      order: hints.order ?? [],
      groups: Object.entries(hints.groups ?? {}).map(([key, groupFields]) => ({
        key,
        label: groupLabel(level, section, key),
        fields: groupFields,
      })),
      docs: hints.docs ?? null,
      fields,
    };
  }

  return result;
}

function parseSectionMapping(source, constantName, level) {
  const match = source.match(
    new RegExp(`const ${constantName}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`),
  );
  if (!match) return [];
  return [...match[1].matchAll(/(\w+)\s*:\s*"([^"]+)"/g)].map(
    ([, section, page]) => ({ section, page, level }),
  );
}

function buildNavigation() {
  const source = fs.readFileSync(settingsSourcePath, "utf8");
  const settingsBlock = source.match(
    /const settingsGroups\s*=\s*\[([\s\S]*?)\n\];/,
  )?.[1];
  if (!settingsBlock) return { groups: [], pages: {} };

  const mappings = [
    ...parseSectionMapping(source, "GLOBAL_SECTION_MAPPING", "global"),
    ...parseSectionMapping(source, "CAMERA_SECTION_MAPPING", "camera"),
    ...parseSectionMapping(source, "ENRICHMENTS_SECTION_MAPPING", "global"),
    ...parseSectionMapping(source, "SYSTEM_SECTION_MAPPING", "global"),
  ];
  const pages = Object.fromEntries(
    mappings.map((mapping) => [mapping.page, mapping]),
  );
  const groupMatches = [...settingsBlock.matchAll(/\{\s*label:\s*"([^"]+)"/g)];
  const groups = groupMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = groupMatches[index + 1]?.index ?? settingsBlock.length;
    const sourceSlice = settingsBlock.slice(start, end);
    const itemKeys = [...sourceSlice.matchAll(/key:\s*"([^"]+)"/g)].map(
      (item) => item[1],
    );
    return {
      key: match[1],
      label: settingsTranslations.menu?.[match[1]] ?? match[1],
      items: itemKeys.map((key) => ({
        key,
        label: settingsTranslations.menu?.[key] ?? key,
        ...(key === "masksAndZones"
          ? { section: key, page: key, level: "camera" }
          : {}),
        ...(pages[key] ?? {}),
      })),
    };
  });

  return { groups, pages };
}

function buildDetectorTypes() {
  const detectorTranslations = translations.global?.detectors ?? {};
  const reserved = new Set([
    "label",
    "description",
    "type",
    "model",
    "model_path",
  ]);

  return Object.fromEntries(
    Object.entries(detectorTranslations)
      .filter(
        ([key, value]) =>
          !reserved.has(key) &&
          value &&
          typeof value === "object" &&
          typeof value.label === "string" &&
          typeof value.description === "string",
      )
      .map(([type, value]) => [
        type,
        {
          label: value.label,
          description: value.description,
          fields: Object.fromEntries(
            Object.entries(value)
              .filter(
                ([key, field]) =>
                  !["label", "description"].includes(key) &&
                  field &&
                  typeof field === "object" &&
                  typeof field.label === "string",
              )
              .map(([key, field]) => [
                key,
                {
                  label: field.label,
                  description: field.description ?? "",
                },
              ]),
          ),
        },
      ]),
  );
}

const manifest = {
  generatedFrom: path.relative(repoRoot, schemaPath).replaceAll("\\", "/"),
  detectorTypes: buildDetectorTypes(),
  levels: {
    global: buildLevel("global"),
    camera: buildLevel("camera"),
  },
  navigation: buildNavigation(),
};

const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, "utf8")
    : "";
  if (current !== serialized) {
    console.error(
      `${path.relative(repoRoot, outputPath)} is stale. Run npm run build:mock.`,
    );
    process.exit(1);
  }
  console.log(`Checked ${path.relative(repoRoot, outputPath)}`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);
  console.log(`Generated ${path.relative(repoRoot, outputPath)}`);
}
