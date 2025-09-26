/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as Assert from '../../../base/common/assert.js';
import * as Types from '../../../base/common/types.js';
class RegistryImpl {
    constructor() {
        this.data = new Map();
    }
    add(id, data) {
        Assert.ok(Types.isString(id));
        Assert.ok(Types.isObject(data));
        Assert.ok(!this.data.has(id), 'There is already an extension with this id');
        this.data.set(id, data);
    }
    as(id) {
        return this.data.get(id) || null;
    }
    dispose() {
        this.data.forEach((value) => {
            if (Types.isFunction(value.dispose)) {
                value.dispose();
            }
        });
        this.data.clear();
    }
}
export const Registry = new RegistryImpl();
//# sourceMappingURL=platform.js.map