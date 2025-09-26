/**
 * Turn an estree into an esast.
 *
 * @template {Nodes} Kind
 *   Node kind.
 * @param {Kind} estree
 *   estree.
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns {Kind}
 *   Clean clone of `estree`.
 */
export function fromEstree<Kind extends import("estree").Node>(estree: Kind, options?: Options | null | undefined): Kind;
export type Nodes = import('estree-jsx').Node;
/**
 * Configuration.
 */
export type Options = {
    /**
     * Leave discouraged fields in the tree (default: `false`).
     */
    dirty?: boolean | null | undefined;
};
export type KeysOfType<T, U> = { [K in keyof T]: T[K] extends U ? K : never; }[keyof T];
export type RequiredKeys<T> = Exclude<KeysOfType<T, Exclude<T[keyof T], undefined>>, undefined>;
export type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;
