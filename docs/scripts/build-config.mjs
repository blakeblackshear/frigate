#!/usr/bin/env node

/**
 * Build script: reads config.yaml and generates TypeScript files
 * for the Docker Compose Generator.
 *
 * Usage: node scripts/build-config.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_DIR = path.resolve(__dirname, "../src/components/DockerComposeGenerator/config");
const YAML_PATH = path.join(CONFIG_DIR, "config.yaml");

// Read & parse YAML
const raw = fs.readFileSync(YAML_PATH, "utf8");
const config = yaml.load(raw);

if (!config.devices || !config.hardware || !config.ports) {
  console.error("config.yaml must contain 'devices', 'hardware', and 'ports' sections.");
  process.exit(1);
}

/**
 * Generate a .ts file from a section of the YAML config.
 */
function generateTsFile(sectionName, items, typeName, varName, mapVarName, yamlFilename) {
  const jsonItems = JSON.stringify(items, null, 2);
  // Indent JSON to fit inside the array literal
  const indented = jsonItems
    .split("\n")
    .map((line, i) => (i === 0 ? line : "  " + line))
    .join("\n");

  const content = `/**
 * AUTO-GENERATED FILE — do not edit directly.
 * Source: ${yamlFilename}
 * To update, edit the YAML file and run: npm run build:config
 */

import type { ${typeName} } from "./types";

export const ${varName}: ${typeName}[] = ${indented};

/** Lookup map for quick access by ID */
export const ${mapVarName}: Map<string, ${typeName}> = new Map(${varName}.map((item) => [item.id, item]));
`;

  const outPath = path.join(CONFIG_DIR, `${sectionName}.ts`);
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`  ✓ Generated ${sectionName}.ts (${items.length} items)`);
}

console.log("Building config from config.yaml...");

generateTsFile("devices", config.devices, "DeviceConfig", "devices", "deviceMap", "config.yaml");
generateTsFile("hardware", config.hardware, "HardwareOption", "hardwareOptions", "hardwareMap", "config.yaml");
generateTsFile("ports", config.ports, "PortConfig", "ports", "portMap", "config.yaml");

console.log("Done!");
