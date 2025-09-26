"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsExpression = void 0;
class JsExpression {
    constructor(expression) {
        this.expression = expression;
        this._wasUsed = false;
        this._listeners = [];
    }
    get wasUsed() {
        return this._wasUsed;
    }
    use() {
        if (this._wasUsed)
            return this._expression;
        this._wasUsed = true;
        const expression = (this._expression = this.expression());
        for (const listener of this._listeners)
            listener(expression);
        return expression;
    }
    chain(use) {
        return new JsExpression(() => use(this.use()));
    }
    addListener(listener) {
        this._listeners.push(listener);
    }
}
exports.JsExpression = JsExpression;
//# sourceMappingURL=JsExpression.js.map