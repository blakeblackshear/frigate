import { encodeSVGforURL } from "./url.js";

/**
* Encode the `SVG` to be used on `CSS`: https://bl.ocks.org/jennyknuth/222825e315d45a738ed9d6e04c7a88d0.
*
* @param svg The `SVG` source.
*/
function encodeSvgForCss(svg) {
	let useSvg = svg.startsWith("<svg>") ? svg.replace("<svg>", "<svg >") : svg;
	if (!useSvg.includes(" xmlns:xlink=") && useSvg.includes(" xlink:")) useSvg = useSvg.replace("<svg ", "<svg xmlns:xlink=\"http://www.w3.org/1999/xlink\" ");
	if (!useSvg.includes(" xmlns=")) useSvg = useSvg.replace("<svg ", "<svg xmlns=\"http://www.w3.org/2000/svg\" ");
	return encodeSVGforURL(useSvg);
}

export { encodeSvgForCss };