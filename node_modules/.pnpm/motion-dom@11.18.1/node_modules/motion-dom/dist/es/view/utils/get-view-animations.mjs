function filterViewAnimations(animation) {
    var _a;
    const { effect } = animation;
    if (!effect)
        return false;
    return (effect.target === document.documentElement &&
        ((_a = effect.pseudoElement) === null || _a === void 0 ? void 0 : _a.startsWith("::view-transition")));
}
function getViewAnimations() {
    return document.getAnimations().filter(filterViewAnimations);
}

export { getViewAnimations };
