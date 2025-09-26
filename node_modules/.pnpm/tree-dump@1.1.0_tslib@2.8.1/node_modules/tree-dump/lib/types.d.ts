export interface Printable {
    toString(tab?: string): string;
}
export type PrintChild = (tab: string) => string;
