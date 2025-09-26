/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
import map from "lodash-es/map.js";
export const DFA_ERROR = {};
export class ATNConfigSet {
    constructor() {
        this.map = {};
        this.configs = [];
    }
    get size() {
        return this.configs.length;
    }
    finalize() {
        // Empties the map to free up memory
        this.map = {};
    }
    add(config) {
        const key = getATNConfigKey(config);
        // Only add configs which don't exist in our map already
        // While this does not influence the actual algorithm, adding them anyway would massively increase memory consumption
        if (!(key in this.map)) {
            this.map[key] = this.configs.length;
            this.configs.push(config);
        }
    }
    get elements() {
        return this.configs;
    }
    get alts() {
        return map(this.configs, (e) => e.alt);
    }
    get key() {
        let value = "";
        for (const k in this.map) {
            value += k + ":";
        }
        return value;
    }
}
export function getATNConfigKey(config, alt = true) {
    return `${alt ? `a${config.alt}` : ""}s${config.state.stateNumber}:${config.stack.map((e) => e.stateNumber.toString()).join("_")}`;
}
//# sourceMappingURL=dfa.js.map