const NODE_OPTIONS = process.env.NODE_OPTIONS?.split(/\s+/);
export const hasFlag = (flag) => NODE_OPTIONS?.includes(flag) || process.argv.includes(flag);
export const parseVersion = (version) => version.split('.').map(Number.parseFloat);
export const compareVersion = (version1, version2) => {
    const versions1 = parseVersion(version1);
    const versions2 = parseVersion(version2);
    const length = Math.max(versions1.length, versions2.length);
    for (let i = 0; i < length; i++) {
        const v1 = versions1[i] || 0;
        const v2 = versions2[i] || 0;
        if (v1 > v2) {
            return 1;
        }
        if (v1 < v2) {
            return -1;
        }
    }
    return 0;
};
export const NODE_VERSION = process.versions.node;
export const compareNodeVersion = (version) => compareVersion(NODE_VERSION, version);
//# sourceMappingURL=common.js.map