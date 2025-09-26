export declare class JsExpression {
    private expression;
    private _wasUsed;
    private _expression?;
    private _listeners;
    constructor(expression: () => string);
    get wasUsed(): boolean;
    use(): string;
    chain(use: (expr: string) => string): JsExpression;
    addListener(listener: (expr: string) => void): void;
}
