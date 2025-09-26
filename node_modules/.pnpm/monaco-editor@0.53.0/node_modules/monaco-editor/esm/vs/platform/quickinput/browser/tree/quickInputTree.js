/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function getParentNodeState(parentChildren) {
    let containsChecks = false;
    let containsUnchecks = false;
    let containsPartial = false;
    for (const element of parentChildren) {
        switch (element.element?.checked) {
            case 'partial':
                containsPartial = true;
                break;
            case true:
                containsChecks = true;
                break;
            default:
                containsUnchecks = true;
                break;
        }
        if (containsChecks && containsUnchecks && containsPartial) {
            break;
        }
    }
    const newState = containsUnchecks
        ? containsPartial
            ? 'partial'
            : containsChecks
                ? 'partial'
                : false
        : containsPartial
            ? 'partial'
            : containsChecks;
    return newState;
}
//# sourceMappingURL=quickInputTree.js.map