import type { D3Selection, MaybePromise } from '../../types.js';
import type { Node, ShapeRenderOptions } from '../types.js';
import { anchor } from './shapes/anchor.js';
import { bowTieRect } from './shapes/bowTieRect.js';
import { card } from './shapes/card.js';
import { choice } from './shapes/choice.js';
import { circle } from './shapes/circle.js';
import { crossedCircle } from './shapes/crossedCircle.js';
import { curlyBraceLeft } from './shapes/curlyBraceLeft.js';
import { curlyBraceRight } from './shapes/curlyBraceRight.js';
import { curlyBraces } from './shapes/curlyBraces.js';
import { curvedTrapezoid } from './shapes/curvedTrapezoid.js';
import { cylinder } from './shapes/cylinder.js';
import { dividedRectangle } from './shapes/dividedRect.js';
import { doublecircle } from './shapes/doubleCircle.js';
import { filledCircle } from './shapes/filledCircle.js';
import { flippedTriangle } from './shapes/flippedTriangle.js';
import { forkJoin } from './shapes/forkJoin.js';
import { halfRoundedRectangle } from './shapes/halfRoundedRectangle.js';
import { hexagon } from './shapes/hexagon.js';
import { hourglass } from './shapes/hourglass.js';
import { icon } from './shapes/icon.js';
import { iconCircle } from './shapes/iconCircle.js';
import { iconRounded } from './shapes/iconRounded.js';
import { iconSquare } from './shapes/iconSquare.js';
import { imageSquare } from './shapes/imageSquare.js';
import { inv_trapezoid } from './shapes/invertedTrapezoid.js';
import { labelRect } from './shapes/labelRect.js';
import { lean_left } from './shapes/leanLeft.js';
import { lean_right } from './shapes/leanRight.js';
import { lightningBolt } from './shapes/lightningBolt.js';
import { linedCylinder } from './shapes/linedCylinder.js';
import { linedWaveEdgedRect } from './shapes/linedWaveEdgedRect.js';
import { multiRect } from './shapes/multiRect.js';
import { multiWaveEdgedRectangle } from './shapes/multiWaveEdgedRectangle.js';
import { note } from './shapes/note.js';
import { question } from './shapes/question.js';
import { rect_left_inv_arrow } from './shapes/rectLeftInvArrow.js';
import { rectWithTitle } from './shapes/rectWithTitle.js';
import { roundedRect } from './shapes/roundedRect.js';
import { shadedProcess } from './shapes/shadedProcess.js';
import { slopedRect } from './shapes/slopedRect.js';
import { squareRect } from './shapes/squareRect.js';
import { stadium } from './shapes/stadium.js';
import { state } from './shapes/state.js';
import { stateEnd } from './shapes/stateEnd.js';
import { stateStart } from './shapes/stateStart.js';
import { subroutine } from './shapes/subroutine.js';
import { taggedRect } from './shapes/taggedRect.js';
import { taggedWaveEdgedRectangle } from './shapes/taggedWaveEdgedRectangle.js';
import { text } from './shapes/text.js';
import { tiltedCylinder } from './shapes/tiltedCylinder.js';
import { trapezoid } from './shapes/trapezoid.js';
import { trapezoidalPentagon } from './shapes/trapezoidalPentagon.js';
import { triangle } from './shapes/triangle.js';
import { waveEdgedRectangle } from './shapes/waveEdgedRectangle.js';
import { waveRectangle } from './shapes/waveRectangle.js';
import { windowPane } from './shapes/windowPane.js';
import { erBox } from './shapes/erBox.js';
import { classBox } from './shapes/classBox.js';
import { requirementBox } from './shapes/requirementBox.js';
import { kanbanItem } from './shapes/kanbanItem.js';
import { bang } from './shapes/bang.js';
import { cloud } from './shapes/cloud.js';
import { defaultMindmapNode } from './shapes/defaultMindmapNode.js';
import { mindmapCircle } from './shapes/mindmapCircle.js';
type ShapeHandler = <T extends SVGGraphicsElement>(parent: D3Selection<T>, node: Node, options: ShapeRenderOptions) => MaybePromise<D3Selection<SVGGElement>>;
export interface ShapeDefinition {
    semanticName: string;
    name: string;
    shortName: string;
    description: string;
    /**
     * Aliases can include descriptive names, other short names, etc.
     */
    aliases?: string[];
    /**
     * These are names used by mermaid before the introduction of new shapes. These will not be in standard formats, and shouldn't be used by the users
     */
    internalAliases?: string[];
    handler: ShapeHandler;
}
export declare const shapesDefs: [{
    readonly semanticName: "Process";
    readonly name: "Rectangle";
    readonly shortName: "rect";
    readonly description: "Standard process shape";
    readonly aliases: ["proc", "process", "rectangle"];
    readonly internalAliases: ["squareRect"];
    readonly handler: typeof squareRect;
}, {
    readonly semanticName: "Event";
    readonly name: "Rounded Rectangle";
    readonly shortName: "rounded";
    readonly description: "Represents an event";
    readonly aliases: ["event"];
    readonly internalAliases: ["roundedRect"];
    readonly handler: typeof roundedRect;
}, {
    readonly semanticName: "Terminal Point";
    readonly name: "Stadium";
    readonly shortName: "stadium";
    readonly description: "Terminal point";
    readonly aliases: ["terminal", "pill"];
    readonly handler: typeof stadium;
}, {
    readonly semanticName: "Subprocess";
    readonly name: "Framed Rectangle";
    readonly shortName: "fr-rect";
    readonly description: "Subprocess";
    readonly aliases: ["subprocess", "subproc", "framed-rectangle", "subroutine"];
    readonly handler: typeof subroutine;
}, {
    readonly semanticName: "Database";
    readonly name: "Cylinder";
    readonly shortName: "cyl";
    readonly description: "Database storage";
    readonly aliases: ["db", "database", "cylinder"];
    readonly handler: typeof cylinder;
}, {
    readonly semanticName: "Start";
    readonly name: "Circle";
    readonly shortName: "circle";
    readonly description: "Starting point";
    readonly aliases: ["circ"];
    readonly handler: typeof circle;
}, {
    readonly semanticName: "Bang";
    readonly name: "Bang";
    readonly shortName: "bang";
    readonly description: "Bang";
    readonly aliases: ["bang"];
    readonly handler: typeof bang;
}, {
    readonly semanticName: "Cloud";
    readonly name: "Cloud";
    readonly shortName: "cloud";
    readonly description: "cloud";
    readonly aliases: ["cloud"];
    readonly handler: typeof cloud;
}, {
    readonly semanticName: "Decision";
    readonly name: "Diamond";
    readonly shortName: "diam";
    readonly description: "Decision-making step";
    readonly aliases: ["decision", "diamond", "question"];
    readonly handler: typeof question;
}, {
    readonly semanticName: "Prepare Conditional";
    readonly name: "Hexagon";
    readonly shortName: "hex";
    readonly description: "Preparation or condition step";
    readonly aliases: ["hexagon", "prepare"];
    readonly handler: typeof hexagon;
}, {
    readonly semanticName: "Data Input/Output";
    readonly name: "Lean Right";
    readonly shortName: "lean-r";
    readonly description: "Represents input or output";
    readonly aliases: ["lean-right", "in-out"];
    readonly internalAliases: ["lean_right"];
    readonly handler: typeof lean_right;
}, {
    readonly semanticName: "Data Input/Output";
    readonly name: "Lean Left";
    readonly shortName: "lean-l";
    readonly description: "Represents output or input";
    readonly aliases: ["lean-left", "out-in"];
    readonly internalAliases: ["lean_left"];
    readonly handler: typeof lean_left;
}, {
    readonly semanticName: "Priority Action";
    readonly name: "Trapezoid Base Bottom";
    readonly shortName: "trap-b";
    readonly description: "Priority action";
    readonly aliases: ["priority", "trapezoid-bottom", "trapezoid"];
    readonly handler: typeof trapezoid;
}, {
    readonly semanticName: "Manual Operation";
    readonly name: "Trapezoid Base Top";
    readonly shortName: "trap-t";
    readonly description: "Represents a manual task";
    readonly aliases: ["manual", "trapezoid-top", "inv-trapezoid"];
    readonly internalAliases: ["inv_trapezoid"];
    readonly handler: typeof inv_trapezoid;
}, {
    readonly semanticName: "Stop";
    readonly name: "Double Circle";
    readonly shortName: "dbl-circ";
    readonly description: "Represents a stop point";
    readonly aliases: ["double-circle"];
    readonly internalAliases: ["doublecircle"];
    readonly handler: typeof doublecircle;
}, {
    readonly semanticName: "Text Block";
    readonly name: "Text Block";
    readonly shortName: "text";
    readonly description: "Text block";
    readonly handler: typeof text;
}, {
    readonly semanticName: "Card";
    readonly name: "Notched Rectangle";
    readonly shortName: "notch-rect";
    readonly description: "Represents a card";
    readonly aliases: ["card", "notched-rectangle"];
    readonly handler: typeof card;
}, {
    readonly semanticName: "Lined/Shaded Process";
    readonly name: "Lined Rectangle";
    readonly shortName: "lin-rect";
    readonly description: "Lined process shape";
    readonly aliases: ["lined-rectangle", "lined-process", "lin-proc", "shaded-process"];
    readonly handler: typeof shadedProcess;
}, {
    readonly semanticName: "Start";
    readonly name: "Small Circle";
    readonly shortName: "sm-circ";
    readonly description: "Small starting point";
    readonly aliases: ["start", "small-circle"];
    readonly internalAliases: ["stateStart"];
    readonly handler: typeof stateStart;
}, {
    readonly semanticName: "Stop";
    readonly name: "Framed Circle";
    readonly shortName: "fr-circ";
    readonly description: "Stop point";
    readonly aliases: ["stop", "framed-circle"];
    readonly internalAliases: ["stateEnd"];
    readonly handler: typeof stateEnd;
}, {
    readonly semanticName: "Fork/Join";
    readonly name: "Filled Rectangle";
    readonly shortName: "fork";
    readonly description: "Fork or join in process flow";
    readonly aliases: ["join"];
    readonly internalAliases: ["forkJoin"];
    readonly handler: typeof forkJoin;
}, {
    readonly semanticName: "Collate";
    readonly name: "Hourglass";
    readonly shortName: "hourglass";
    readonly description: "Represents a collate operation";
    readonly aliases: ["hourglass", "collate"];
    readonly handler: typeof hourglass;
}, {
    readonly semanticName: "Comment";
    readonly name: "Curly Brace";
    readonly shortName: "brace";
    readonly description: "Adds a comment";
    readonly aliases: ["comment", "brace-l"];
    readonly handler: typeof curlyBraceLeft;
}, {
    readonly semanticName: "Comment Right";
    readonly name: "Curly Brace";
    readonly shortName: "brace-r";
    readonly description: "Adds a comment";
    readonly handler: typeof curlyBraceRight;
}, {
    readonly semanticName: "Comment with braces on both sides";
    readonly name: "Curly Braces";
    readonly shortName: "braces";
    readonly description: "Adds a comment";
    readonly handler: typeof curlyBraces;
}, {
    readonly semanticName: "Com Link";
    readonly name: "Lightning Bolt";
    readonly shortName: "bolt";
    readonly description: "Communication link";
    readonly aliases: ["com-link", "lightning-bolt"];
    readonly handler: typeof lightningBolt;
}, {
    readonly semanticName: "Document";
    readonly name: "Document";
    readonly shortName: "doc";
    readonly description: "Represents a document";
    readonly aliases: ["doc", "document"];
    readonly handler: typeof waveEdgedRectangle;
}, {
    readonly semanticName: "Delay";
    readonly name: "Half-Rounded Rectangle";
    readonly shortName: "delay";
    readonly description: "Represents a delay";
    readonly aliases: ["half-rounded-rectangle"];
    readonly handler: typeof halfRoundedRectangle;
}, {
    readonly semanticName: "Direct Access Storage";
    readonly name: "Horizontal Cylinder";
    readonly shortName: "h-cyl";
    readonly description: "Direct access storage";
    readonly aliases: ["das", "horizontal-cylinder"];
    readonly handler: typeof tiltedCylinder;
}, {
    readonly semanticName: "Disk Storage";
    readonly name: "Lined Cylinder";
    readonly shortName: "lin-cyl";
    readonly description: "Disk storage";
    readonly aliases: ["disk", "lined-cylinder"];
    readonly handler: typeof linedCylinder;
}, {
    readonly semanticName: "Display";
    readonly name: "Curved Trapezoid";
    readonly shortName: "curv-trap";
    readonly description: "Represents a display";
    readonly aliases: ["curved-trapezoid", "display"];
    readonly handler: typeof curvedTrapezoid;
}, {
    readonly semanticName: "Divided Process";
    readonly name: "Divided Rectangle";
    readonly shortName: "div-rect";
    readonly description: "Divided process shape";
    readonly aliases: ["div-proc", "divided-rectangle", "divided-process"];
    readonly handler: typeof dividedRectangle;
}, {
    readonly semanticName: "Extract";
    readonly name: "Triangle";
    readonly shortName: "tri";
    readonly description: "Extraction process";
    readonly aliases: ["extract", "triangle"];
    readonly handler: typeof triangle;
}, {
    readonly semanticName: "Internal Storage";
    readonly name: "Window Pane";
    readonly shortName: "win-pane";
    readonly description: "Internal storage";
    readonly aliases: ["internal-storage", "window-pane"];
    readonly handler: typeof windowPane;
}, {
    readonly semanticName: "Junction";
    readonly name: "Filled Circle";
    readonly shortName: "f-circ";
    readonly description: "Junction point";
    readonly aliases: ["junction", "filled-circle"];
    readonly handler: typeof filledCircle;
}, {
    readonly semanticName: "Loop Limit";
    readonly name: "Trapezoidal Pentagon";
    readonly shortName: "notch-pent";
    readonly description: "Loop limit step";
    readonly aliases: ["loop-limit", "notched-pentagon"];
    readonly handler: typeof trapezoidalPentagon;
}, {
    readonly semanticName: "Manual File";
    readonly name: "Flipped Triangle";
    readonly shortName: "flip-tri";
    readonly description: "Manual file operation";
    readonly aliases: ["manual-file", "flipped-triangle"];
    readonly handler: typeof flippedTriangle;
}, {
    readonly semanticName: "Manual Input";
    readonly name: "Sloped Rectangle";
    readonly shortName: "sl-rect";
    readonly description: "Manual input step";
    readonly aliases: ["manual-input", "sloped-rectangle"];
    readonly handler: typeof slopedRect;
}, {
    readonly semanticName: "Multi-Document";
    readonly name: "Stacked Document";
    readonly shortName: "docs";
    readonly description: "Multiple documents";
    readonly aliases: ["documents", "st-doc", "stacked-document"];
    readonly handler: typeof multiWaveEdgedRectangle;
}, {
    readonly semanticName: "Multi-Process";
    readonly name: "Stacked Rectangle";
    readonly shortName: "st-rect";
    readonly description: "Multiple processes";
    readonly aliases: ["procs", "processes", "stacked-rectangle"];
    readonly handler: typeof multiRect;
}, {
    readonly semanticName: "Stored Data";
    readonly name: "Bow Tie Rectangle";
    readonly shortName: "bow-rect";
    readonly description: "Stored data";
    readonly aliases: ["stored-data", "bow-tie-rectangle"];
    readonly handler: typeof bowTieRect;
}, {
    readonly semanticName: "Summary";
    readonly name: "Crossed Circle";
    readonly shortName: "cross-circ";
    readonly description: "Summary";
    readonly aliases: ["summary", "crossed-circle"];
    readonly handler: typeof crossedCircle;
}, {
    readonly semanticName: "Tagged Document";
    readonly name: "Tagged Document";
    readonly shortName: "tag-doc";
    readonly description: "Tagged document";
    readonly aliases: ["tag-doc", "tagged-document"];
    readonly handler: typeof taggedWaveEdgedRectangle;
}, {
    readonly semanticName: "Tagged Process";
    readonly name: "Tagged Rectangle";
    readonly shortName: "tag-rect";
    readonly description: "Tagged process";
    readonly aliases: ["tagged-rectangle", "tag-proc", "tagged-process"];
    readonly handler: typeof taggedRect;
}, {
    readonly semanticName: "Paper Tape";
    readonly name: "Flag";
    readonly shortName: "flag";
    readonly description: "Paper tape";
    readonly aliases: ["paper-tape"];
    readonly handler: typeof waveRectangle;
}, {
    readonly semanticName: "Odd";
    readonly name: "Odd";
    readonly shortName: "odd";
    readonly description: "Odd shape";
    readonly internalAliases: ["rect_left_inv_arrow"];
    readonly handler: typeof rect_left_inv_arrow;
}, {
    readonly semanticName: "Lined Document";
    readonly name: "Lined Document";
    readonly shortName: "lin-doc";
    readonly description: "Lined document";
    readonly aliases: ["lined-document"];
    readonly handler: typeof linedWaveEdgedRect;
}];
export declare const shapes: Record<"join" | "state" | "anchor" | "db" | "summary" | "database" | "start" | "document" | "event" | "stop" | "process" | "text" | "circle" | "rect" | "display" | "squareRect" | "choice" | "note" | "rectWithTitle" | "labelRect" | "iconSquare" | "iconCircle" | "icon" | "iconRounded" | "imageSquare" | "kanbanItem" | "mindmapCircle" | "defaultMindmapNode" | "classBox" | "erBox" | "requirementBox" | "proc" | "rectangle" | "rounded" | "roundedRect" | "stadium" | "terminal" | "pill" | "fr-rect" | "subprocess" | "subproc" | "framed-rectangle" | "subroutine" | "cyl" | "cylinder" | "circ" | "bang" | "cloud" | "diam" | "decision" | "diamond" | "question" | "hex" | "hexagon" | "prepare" | "lean-r" | "lean-right" | "in-out" | "lean_right" | "lean-l" | "lean-left" | "out-in" | "lean_left" | "trap-b" | "priority" | "trapezoid-bottom" | "trapezoid" | "trap-t" | "manual" | "trapezoid-top" | "inv-trapezoid" | "inv_trapezoid" | "dbl-circ" | "double-circle" | "doublecircle" | "notch-rect" | "card" | "notched-rectangle" | "lin-rect" | "lined-rectangle" | "lined-process" | "lin-proc" | "shaded-process" | "sm-circ" | "small-circle" | "stateStart" | "fr-circ" | "framed-circle" | "stateEnd" | "fork" | "forkJoin" | "hourglass" | "collate" | "brace" | "comment" | "brace-l" | "brace-r" | "braces" | "bolt" | "com-link" | "lightning-bolt" | "doc" | "delay" | "half-rounded-rectangle" | "h-cyl" | "das" | "horizontal-cylinder" | "lin-cyl" | "disk" | "lined-cylinder" | "curv-trap" | "curved-trapezoid" | "div-rect" | "div-proc" | "divided-rectangle" | "divided-process" | "tri" | "extract" | "triangle" | "win-pane" | "internal-storage" | "window-pane" | "f-circ" | "junction" | "filled-circle" | "notch-pent" | "loop-limit" | "notched-pentagon" | "flip-tri" | "manual-file" | "flipped-triangle" | "sl-rect" | "manual-input" | "sloped-rectangle" | "docs" | "documents" | "st-doc" | "stacked-document" | "st-rect" | "procs" | "processes" | "stacked-rectangle" | "bow-rect" | "stored-data" | "bow-tie-rectangle" | "cross-circ" | "crossed-circle" | "tag-doc" | "tagged-document" | "tag-rect" | "tagged-rectangle" | "tag-proc" | "tagged-process" | "flag" | "paper-tape" | "odd" | "rect_left_inv_arrow" | "lin-doc" | "lined-document", typeof state | typeof choice | typeof note | typeof rectWithTitle | typeof labelRect | typeof iconSquare | typeof iconCircle | typeof icon | typeof iconRounded | typeof imageSquare | typeof anchor | typeof kanbanItem | typeof mindmapCircle | typeof defaultMindmapNode | typeof classBox | typeof erBox | typeof requirementBox | typeof squareRect | typeof roundedRect | typeof stadium | typeof subroutine | typeof cylinder | typeof circle | typeof bang | typeof cloud | typeof question | typeof hexagon | typeof lean_right | typeof lean_left | typeof trapezoid | typeof inv_trapezoid | typeof doublecircle | typeof text | typeof card | typeof shadedProcess | typeof stateStart | typeof stateEnd | typeof forkJoin | typeof hourglass | typeof curlyBraceLeft | typeof curlyBraceRight | typeof curlyBraces | typeof lightningBolt | typeof waveEdgedRectangle | typeof halfRoundedRectangle | typeof tiltedCylinder | typeof linedCylinder | typeof curvedTrapezoid | typeof dividedRectangle | typeof triangle | typeof windowPane | typeof filledCircle | typeof trapezoidalPentagon | typeof flippedTriangle | typeof slopedRect | typeof multiWaveEdgedRectangle | typeof multiRect | typeof bowTieRect | typeof crossedCircle | typeof taggedWaveEdgedRectangle | typeof taggedRect | typeof waveRectangle | typeof rect_left_inv_arrow | typeof linedWaveEdgedRect>;
export declare function isValidShape(shape: string): shape is ShapeID;
export type ShapeID = keyof typeof shapes;
export {};
