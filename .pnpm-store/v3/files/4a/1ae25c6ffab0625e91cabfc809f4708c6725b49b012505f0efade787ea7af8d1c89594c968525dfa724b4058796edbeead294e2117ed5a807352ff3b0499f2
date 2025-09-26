import { FanOut } from 'thingies/lib/fanout';
import type { Node } from './Node';
import type { Superblock } from './Superblock';
export type LinkEventChildAdd = [type: 'child:add', link: Link, parent: Link];
export type LinkEventChildDelete = [type: 'child:del', link: Link, parent: Link];
export type LinkEvent = LinkEventChildAdd | LinkEventChildDelete;
/**
 * Represents a hard link that points to an i-node `node`.
 */
export declare class Link {
    readonly changes: FanOut<LinkEvent>;
    vol: Superblock;
    parent: Link | undefined;
    children: Map<string, Link | undefined>;
    private _steps;
    node: Node;
    ino: number;
    length: number;
    name: string;
    get steps(): string[];
    set steps(val: string[]);
    constructor(vol: Superblock, parent: Link | undefined, name: string);
    setNode(node: Node): void;
    getNode(): Node;
    createChild(name: string, node?: Node): Link;
    setChild(name: string, link?: Link): Link;
    deleteChild(link: Link): void;
    getChild(name: string): Link | undefined;
    getPath(): string;
    getParentPath(): string;
    getName(): string;
    toJSON(): {
        steps: string[];
        ino: number;
        children: string[];
    };
    syncSteps(): void;
}
