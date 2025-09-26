export interface Position {
    position: number;
    extent: number;
    content: string;
    line: number;
}
export interface Options {
    disabled?: boolean;
    indentation?: number;
}
export interface Edit {
    /** Replaces the entire content of the editable while adjusting the caret position. */
    update(content: string): void;
    /** Inserts new text at the caret position while deleting text in range of the offset (which accepts negative offsets). */
    insert(append: string, offset?: number): void;
    /** Positions the caret where specified */
    move(pos: number | {
        row: number;
        column: number;
    }): void;
    /** Returns the current editor state, as usually received in onChange */
    getState(): {
        text: string;
        position: Position;
    };
}
export declare const useEditable: (elementRef: {
    current: HTMLElement | undefined | null;
}, onChange: (text: string, position: Position) => void, opts?: Options | undefined) => Edit;
