import { type JsonPath } from "json-crawl";
import type { AllOfRef, NormalizeResponse } from "./types";
export declare const normalizeAllOfItems: (allOfItems: unknown[], jsonPath: JsonPath, source: unknown, allOfRefs: AllOfRef[]) => NormalizeResponse;
