import type { WindowVirtualizerProps } from "./WindowVirtualizer.type";
declare class __sveltets_Render<T> {
    props(): WindowVirtualizerProps<T>;
    events(): {};
    slots(): {};
    bindings(): "";
    exports(): {
        findStartIndex: () => number;
        findEndIndex: () => number;
        scrollToIndex: (index: number, opts?: import("../core").ScrollToIndexOpts) => void;
    };
}
interface $$IsomorphicComponent {
    new <T>(options: import('svelte').ComponentConstructorOptions<ReturnType<__sveltets_Render<T>['props']>>): import('svelte').SvelteComponent<ReturnType<__sveltets_Render<T>['props']>, ReturnType<__sveltets_Render<T>['events']>, ReturnType<__sveltets_Render<T>['slots']>> & {
        $$bindings?: ReturnType<__sveltets_Render<T>['bindings']>;
    } & ReturnType<__sveltets_Render<T>['exports']>;
    <T>(internal: unknown, props: ReturnType<__sveltets_Render<T>['props']> & {}): ReturnType<__sveltets_Render<T>['exports']>;
    z_$$bindings?: ReturnType<__sveltets_Render<any>['bindings']>;
}
/** {@link Virtualizer} controlled by the window scrolling. See {@link WindowVirtualizerProps} and {@link WindowVirtualizerHandle}. */
declare const WindowVirtualizer: $$IsomorphicComponent;
type WindowVirtualizer<T> = InstanceType<typeof WindowVirtualizer<T>>;
export default WindowVirtualizer;
