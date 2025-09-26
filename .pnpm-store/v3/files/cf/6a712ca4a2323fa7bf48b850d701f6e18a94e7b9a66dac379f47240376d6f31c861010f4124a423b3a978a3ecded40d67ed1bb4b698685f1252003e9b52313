import type { MermaidConfig } from '../config.type.js';
import type { DetectorRecord, DiagramDetector, DiagramLoader, ExternalDiagramDefinition } from './types.js';
export declare const detectors: Record<string, DetectorRecord>;
/**
 * Detects the type of the graph text.
 *
 * Takes into consideration the possible existence of an `%%init` directive
 *
 * @param text - The text defining the graph. For example:
 *
 * ```mermaid
 *   %%{initialize: {"startOnLoad": true, logLevel: "fatal" }}%%
 *   graph LR
 *    a-->b
 *    b-->c
 *    c-->d
 *    d-->e
 *    e-->f
 *    f-->g
 *    g-->h
 * ```
 *
 * @param config - The mermaid config.
 * @returns A graph definition key
 */
export declare const detectType: (text: string, config?: MermaidConfig) => string;
/**
 * Registers lazy-loaded diagrams to Mermaid.
 *
 * The diagram function is loaded asynchronously, so that diagrams are only loaded
 * if the diagram is detected.
 *
 * @remarks
 * Please note that the order of diagram detectors is important.
 * The first detector to return `true` is the diagram that will be loaded
 * and used, so put more specific detectors at the beginning!
 *
 * @param diagrams - Diagrams to lazy load, and their detectors, in order of importance.
 */
export declare const registerLazyLoadedDiagrams: (...diagrams: ExternalDiagramDefinition[]) => void;
export declare const addDetector: (key: string, detector: DiagramDetector, loader?: DiagramLoader) => void;
export declare const getDiagramLoader: (key: string) => DiagramLoader | undefined;
