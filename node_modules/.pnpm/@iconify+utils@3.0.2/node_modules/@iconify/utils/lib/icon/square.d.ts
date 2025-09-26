import { SVGViewBox } from "../svg/viewbox.js";
import { IconifyIcon } from "@iconify/types";
/**
 * Make icon square
 */
declare function makeIconSquare(icon: Required<IconifyIcon>): Required<IconifyIcon>;
/**
 * Make icon viewBox square
 */
declare function makeViewBoxSquare(viewBox: SVGViewBox): SVGViewBox;
export { makeIconSquare, makeViewBoxSquare };