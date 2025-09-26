export function cc(char) {
    return char.charCodeAt(0);
}
export function insertToSet(item, set) {
    if (Array.isArray(item)) {
        item.forEach(function (subItem) {
            set.push(subItem);
        });
    }
    else {
        set.push(item);
    }
}
export function addFlag(flagObj, flagKey) {
    if (flagObj[flagKey] === true) {
        throw "duplicate flag " + flagKey;
    }
    const x = flagObj[flagKey];
    flagObj[flagKey] = true;
}
export function ASSERT_EXISTS(obj) {
    // istanbul ignore next
    if (obj === undefined) {
        throw Error("Internal Error - Should never get here!");
    }
    return true;
}
// istanbul ignore next
export function ASSERT_NEVER_REACH_HERE() {
    throw Error("Internal Error - Should never get here!");
}
export function isCharacter(obj) {
    return obj["type"] === "Character";
}
//# sourceMappingURL=utils.js.map