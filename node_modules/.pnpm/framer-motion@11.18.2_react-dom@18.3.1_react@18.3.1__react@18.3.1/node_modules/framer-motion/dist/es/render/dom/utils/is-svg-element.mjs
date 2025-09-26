function isSVGElement(element) {
    return element instanceof SVGElement && element.tagName !== "svg";
}

export { isSVGElement };
