// Hook for efficiently working with config schemas
// Caches resolved section schemas to avoid repeated expensive resolution

import { useMemo } from "react";
import useSWR from "swr";
import { RJSFSchema } from "@rjsf/utils";
import { resolveAndCleanSchema } from "@/lib/config-schema";

// Cache for resolved section schemas - keyed by schema reference + section key
const sectionSchemaCache = new WeakMap<RJSFSchema, Map<string, RJSFSchema>>();

type SchemaWithDefinitions = RJSFSchema & {
  $defs?: Record<string, RJSFSchema>;
  definitions?: Record<string, RJSFSchema>;
  properties?: Record<string, RJSFSchema>;
};

const getSchemaDefinitions = (schema: RJSFSchema): Record<string, RJSFSchema> =>
  (schema as SchemaWithDefinitions).$defs ||
  (schema as SchemaWithDefinitions).definitions ||
  {};

/**
 * Extracts and resolves a section schema from the full config schema
 * Uses caching to avoid repeated expensive resolution
 */
function extractSectionSchema(
  schema: RJSFSchema,
  sectionPath: string,
  level: "global" | "camera",
): RJSFSchema | null {
  // Create cache key
  const cacheKey = `${level}:${sectionPath}`;

  // Check cache first (using WeakMap with schema as key for proper garbage collection)
  let schemaCache = sectionSchemaCache.get(schema);
  if (!schemaCache) {
    schemaCache = new Map<string, RJSFSchema>();
    sectionSchemaCache.set(schema, schemaCache);
  }

  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  const defs = getSchemaDefinitions(schema);
  const schemaObj = schema as SchemaWithDefinitions;

  let sectionDef: RJSFSchema | null = null;

  // For camera level, get section from CameraConfig in $defs
  if (level === "camera") {
    const cameraConfigDef = defs.CameraConfig;
    if (cameraConfigDef?.properties) {
      const props = cameraConfigDef.properties;
      const sectionProp = props[sectionPath];

      if (sectionProp && typeof sectionProp === "object") {
        if ("$ref" in sectionProp && typeof sectionProp.$ref === "string") {
          const refPath = sectionProp.$ref
            .replace(/^#\/\$defs\//, "")
            .replace(/^#\/definitions\//, "");
          sectionDef = defs[refPath] || null;
        } else {
          sectionDef = sectionProp;
        }
      }
    }
  } else {
    // For global level, get from root properties
    if (schemaObj.properties) {
      const props = schemaObj.properties;
      const sectionProp = props[sectionPath];

      if (sectionProp && typeof sectionProp === "object") {
        if ("$ref" in sectionProp && typeof sectionProp.$ref === "string") {
          const refPath = sectionProp.$ref
            .replace(/^#\/\$defs\//, "")
            .replace(/^#\/definitions\//, "");
          sectionDef = defs[refPath] || null;
        } else {
          sectionDef = sectionProp;
        }
      }
    }
  }

  if (!sectionDef) return null;

  // Include $defs for nested references and resolve them
  const schemaWithDefs: RJSFSchema = {
    ...sectionDef,
    $defs: defs,
  };

  // Resolve all references and strip $defs from result
  const resolved = resolveAndCleanSchema(schemaWithDefs);

  // Cache the result
  schemaCache.set(cacheKey, resolved);

  return resolved;
}

/**
 * Note: Cache is automatically cleared when schema changes since we use WeakMap
 * with the schema object as key. No manual clearing needed.
 */

/**
 * Hook to get a resolved section schema
 * Efficiently caches resolved schemas to avoid repeated expensive operations
 */
export function useSectionSchema(
  sectionPath: string,
  level: "global" | "camera",
): RJSFSchema | null {
  const { data: schema } = useSWR<RJSFSchema>("config/schema.json");

  return useMemo(() => {
    if (!schema) return null;
    return extractSectionSchema(schema, sectionPath, level);
  }, [schema, sectionPath, level]);
}

/**
 * Hook to get the raw config schema
 */
export function useConfigSchema(): RJSFSchema | undefined {
  const { data: schema } = useSWR<RJSFSchema>("config/schema.json");
  return schema;
}
