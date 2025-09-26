import * as React from 'react';
import type ReactReconciler from 'react-reconciler';
/**
 * Represents a react-internal Fiber node.
 */
export declare type Fiber<T = any> = Omit<ReactReconciler.Fiber, 'stateNode'> & {
    stateNode: T;
};
/**
 * Represents a {@link Fiber} node selector for traversal.
 */
export declare type FiberSelector<T = any> = (
/** The current {@link Fiber} node. */
node: Fiber<T | null>) => boolean | void;
/**
 * Traverses up or down a {@link Fiber}, return `true` to stop and select a node.
 */
export declare function traverseFiber<T = any>(
/** Input {@link Fiber} to traverse. */
fiber: Fiber | undefined, 
/** Whether to ascend and walk up the tree. Will walk down if `false`. */
ascending: boolean, 
/** A {@link Fiber} node selector, returns the first match when `true` is passed. */
selector: FiberSelector<T>): Fiber<T> | undefined;
/**
 * A react-internal {@link Fiber} provider. This component binds React children to the React Fiber tree. Call its-fine hooks within this.
 */
export declare class FiberProvider extends React.Component<{
    children?: React.ReactNode;
}> {
    private _reactInternals;
    render(): JSX.Element;
}
/**
 * Returns the current react-internal {@link Fiber}. This is an implementation detail of [react-reconciler](https://github.com/facebook/react/tree/main/packages/react-reconciler).
 */
export declare function useFiber(): Fiber<null> | undefined;
/**
 * Represents a react-reconciler container instance.
 */
export interface ContainerInstance<T = any> {
    containerInfo: T;
}
/**
 * Returns the current react-reconciler container info passed to {@link ReactReconciler.Reconciler.createContainer}.
 *
 * In react-dom, a container will point to the root DOM element; in react-three-fiber, it will point to the root Zustand store.
 */
export declare function useContainer<T = any>(): T | undefined;
/**
 * Returns the nearest react-reconciler child instance or the node created from {@link ReactReconciler.HostConfig.createInstance}.
 *
 * In react-dom, this would be a DOM element; in react-three-fiber this would be an instance descriptor.
 */
export declare function useNearestChild<T = any>(
/** An optional element type to filter to. */
type?: keyof JSX.IntrinsicElements): React.MutableRefObject<T | undefined>;
/**
 * Returns the nearest react-reconciler parent instance or the node created from {@link ReactReconciler.HostConfig.createInstance}.
 *
 * In react-dom, this would be a DOM element; in react-three-fiber this would be an instance descriptor.
 */
export declare function useNearestParent<T = any>(
/** An optional element type to filter to. */
type?: keyof JSX.IntrinsicElements): React.MutableRefObject<T | undefined>;
export declare type ContextMap = Map<React.Context<any>, any> & {
    get<T>(context: React.Context<T>): T | undefined;
};
/**
 * Returns a map of all contexts and their values.
 */
export declare function useContextMap(): ContextMap;
/**
 * Represents a react-context bridge provider component.
 */
export declare type ContextBridge = React.FC<React.PropsWithChildren<{}>>;
/**
 * React Context currently cannot be shared across [React renderers](https://reactjs.org/docs/codebase-overview.html#renderers) but explicitly forwarded between providers (see [react#17275](https://github.com/facebook/react/issues/17275)). This hook returns a {@link ContextBridge} of live context providers to pierce Context across renderers.
 *
 * Pass {@link ContextBridge} as a component to a secondary renderer to enable context-sharing within its children.
 */
export declare function useContextBridge(): ContextBridge;
