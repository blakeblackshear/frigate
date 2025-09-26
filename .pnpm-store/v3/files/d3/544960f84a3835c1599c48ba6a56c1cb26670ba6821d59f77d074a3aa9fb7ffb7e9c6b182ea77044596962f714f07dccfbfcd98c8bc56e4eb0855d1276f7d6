/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import $RefParser from "@apidevtools/json-schema-ref-parser";
import { bundle, Config } from "@redocly/openapi-core";
import type { Source, Document } from "@redocly/openapi-core";
import { ResolvedConfig } from "@redocly/openapi-core/lib/config";
import chalk from "chalk";
// @ts-ignore
import { convertObj } from "swagger2openapi";

import { OpenApiObject } from "../types";
import { OpenAPIParser } from "./services/OpenAPIParser";

function serializer(replacer: any, cycleReplacer: any) {
  var stack: any = [],
    keys: any = [];

  if (cycleReplacer === undefined)
    cycleReplacer = function (key: any, value: any) {
      if (stack[0] === value) return "circular()";
      return value.title ? `circular(${value.title})` : "circular()";
    };

  return function (key: any, value: any) {
    // Resolve discriminator ref pointers
    if (value?.discriminator !== undefined) {
      const parser = new OpenAPIParser(stack[0]);
      if (
        value.discriminator.mapping &&
        typeof value.discriminator.mapping === "object"
      ) {
        for (let [k, v] of Object.entries(value.discriminator.mapping)) {
          const discriminator = k as string;
          if (typeof v === "string" && v.charAt(0) === "#") {
            const ref = v as string;
            const resolvedRef = parser.byRef(ref);
            value.discriminator.mapping[discriminator] = resolvedRef;
          }
        }
      }
    }
    if (stack.length > 0) {
      // @ts-ignore
      var thisPos = stack.indexOf(this);
      // @ts-ignore
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
      // @ts-ignore
      if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value);
    } else stack.push(value);

    // @ts-ignore
    return replacer === undefined ? value : replacer.call(this, key, value);
  };
}

export function convertSwagger2OpenAPI(spec: object) {
  console.warn(
    "[ReDoc Compatibility mode]: Converting OpenAPI 2.0 to OpenAPI 3.0"
  );
  return new Promise((resolve, reject) =>
    convertObj(
      spec,
      {
        patch: true,
        warnOnly: true,
        text: "{}",
        anchors: true,
        resolveInternal: true,
      },
      (err: any, res: any) => {
        // TODO: log any warnings
        if (err) {
          return reject(err);
        }
        resolve(res && res.openapi);
      }
    )
  );
}

async function resolveJsonRefs(specUrlOrObject: object | string) {
  try {
    let schema = await $RefParser.dereference(specUrlOrObject, {
      continueOnError: true,
      resolve: {
        file: true,
        external: true,
        http: {
          timeout: 15000, // 15 sec timeout
        },
      },
      dereference: {
        circular: true,
      },
    });
    return schema as OpenApiObject;
  } catch (err: any) {
    let errorMsg = "";

    if (err.errors[0] !== undefined) {
      const error = err.errors[0];
      errorMsg = `Error: [${error.message}] with footprint [${error.footprint}]`;
    } else {
      errorMsg = err;
    }

    console.error(chalk.yellow(errorMsg));
    return;
  }
}

export async function loadAndResolveSpec(specUrlOrObject: object | string) {
  const config = new Config({} as ResolvedConfig);
  const bundleOpts = {
    config,
    base: process.cwd(),
  } as any;

  if (typeof specUrlOrObject === "object" && specUrlOrObject !== null) {
    bundleOpts["doc"] = {
      source: { absoluteRef: "" } as Source,
      parsed: specUrlOrObject,
    } as Document;
  } else {
    bundleOpts["ref"] = specUrlOrObject;
  }

  // Force dereference ?
  // bundleOpts["dereference"] = true;

  const {
    bundle: { parsed },
  } = await bundle(bundleOpts);

  //Pre-processing before resolving JSON refs
  if (parsed.components) {
    for (let [component, type] of Object.entries(parsed.components) as any) {
      if (component === "schemas") {
        for (let [schemaKey, schemaValue] of Object.entries(type) as any) {
          const title: string | undefined = schemaValue["title"];
          if (!title) {
            schemaValue.title = schemaKey;
          }
        }
      }
    }
  }

  const resolved = await resolveJsonRefs(parsed);

  // Force serialization and replace circular $ref pointers
  // @ts-ignore
  const serialized = JSON.stringify(resolved, serializer());
  let decycled;
  try {
    decycled = JSON.parse(serialized);
  } catch (err: any) {
    console.error(chalk.yellow(err));
  }
  return decycled !== undefined && typeof decycled === "object"
    ? decycled.swagger !== undefined
      ? convertSwagger2OpenAPI(decycled)
      : decycled
    : resolved;
}
