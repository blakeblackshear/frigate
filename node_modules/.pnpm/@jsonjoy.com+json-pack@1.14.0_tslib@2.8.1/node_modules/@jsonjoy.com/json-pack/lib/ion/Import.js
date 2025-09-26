"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
const ast_1 = require("./ast");
class Import {
    constructor(parent, symbols) {
        this.parent = parent;
        this.symbols = symbols;
        this.byText = new Map();
        this.offset = parent ? parent.offset + parent.length : 1;
        this.length = symbols.length;
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            this.byText.set(symbol, this.offset + i);
        }
    }
    getId(symbol) {
        const id = this.byText.get(symbol);
        if (id !== undefined)
            return id;
        if (this.parent)
            this.parent.getId(symbol);
        return undefined;
    }
    getText(id) {
        if (id < this.offset)
            return this.parent ? this.parent.getText(id) : undefined;
        return this.symbols[id - this.offset];
    }
    add(symbol) {
        let id = this.byText.get(symbol);
        if (id !== undefined)
            return id;
        const length = this.symbols.length;
        id = this.offset + length;
        this.symbols.push(symbol);
        this.length++;
        this.byText.set(symbol, id);
        return id;
    }
    toAst() {
        const map = new Map();
        map.set(7, (0, ast_1.toAst)(this.symbols, this));
        return new ast_1.ObjAstNode(map);
    }
}
exports.Import = Import;
//# sourceMappingURL=Import.js.map