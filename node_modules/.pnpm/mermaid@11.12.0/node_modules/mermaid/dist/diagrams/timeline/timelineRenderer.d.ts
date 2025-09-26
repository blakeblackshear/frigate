import type { Selection } from 'd3';
import type { Diagram } from '../../Diagram.js';
import type { MermaidConfig } from '../../config.type.js';
interface TimelineTask {
    id: number;
    section: string;
    type: string;
    task: string;
    score: number;
    events: string[];
}
export declare const draw: (text: string, id: string, version: string, diagObj: Diagram) => void;
export declare const drawTasks: (diagram: Selection<SVGElement, unknown, null, undefined>, tasks: TimelineTask[], sectionColor: number, masterX: number, masterY: number, maxTaskHeight: number, conf: MermaidConfig, maxEventCount: number, maxEventLineLength: number, maxSectionHeight: number, isWithoutSections: boolean) => void;
export declare const drawEvents: (diagram: Selection<SVGElement, unknown, null, undefined>, events: string[], sectionColor: number, masterX: number, masterY: number, conf: MermaidConfig) => number;
declare const _default: {
    setConf: () => void;
    draw: (text: string, id: string, version: string, diagObj: Diagram) => void;
};
export default _default;
