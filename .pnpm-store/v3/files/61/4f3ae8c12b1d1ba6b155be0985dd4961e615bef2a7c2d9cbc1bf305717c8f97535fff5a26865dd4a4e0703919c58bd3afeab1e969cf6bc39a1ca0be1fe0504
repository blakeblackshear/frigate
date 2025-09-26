export type Token = TokenLiteral | TokenPick | TokenRepeat | TokenRange | TokenList;
export type TokenLiteral = string;
export type TokenPick = [type: 'pick', from: string[]];
export type TokenRepeat = [type: 'repeat', min: number, max: number, pattern: Token];
export type TokenRange = [type: 'range', min: number, max: number];
export type TokenList = [type: 'list', what: Token[]];
export declare function randomString(token: Token): string;
