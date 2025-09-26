declare namespace _default {
    export { ERMarkers };
    export { insertMarkers };
}
export default _default;
declare namespace ERMarkers {
    let ONLY_ONE_START: string;
    let ONLY_ONE_END: string;
    let ZERO_OR_ONE_START: string;
    let ZERO_OR_ONE_END: string;
    let ONE_OR_MORE_START: string;
    let ONE_OR_MORE_END: string;
    let ZERO_OR_MORE_START: string;
    let ZERO_OR_MORE_END: string;
    let MD_PARENT_END: string;
    let MD_PARENT_START: string;
}
/**
 * Put the markers into the svg DOM for later use with edge paths
 *
 * @param elem
 * @param conf
 */
declare function insertMarkers(elem: any, conf: any): void;
