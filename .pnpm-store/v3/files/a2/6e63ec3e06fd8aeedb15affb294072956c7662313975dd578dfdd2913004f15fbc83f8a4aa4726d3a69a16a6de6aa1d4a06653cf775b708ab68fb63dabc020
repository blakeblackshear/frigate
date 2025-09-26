import type { VirtualizerProps } from "./Virtualizer.type";
declare class __sveltets_Render<T> {
    props(): VirtualizerProps<T>;
    events(): {};
    slots(): {};
    bindings(): "";
    exports(): {
        getScrollOffset: () => number;
        getScrollSize: () => number;
        getViewportSize: () => number;
        findStartIndex: () => number;
        findEndIndex: () => number;
        getItemOffset: (index: number) => number;
        getItemSize: (index: number) => number;
        scrollToIndex: (index: number, opts?: import("../core").ScrollToIndexOpts) => void;
        scrollTo: (offset: number) => void;
        scrollBy: (offset: number) => void;
    };
}
interface $$IsomorphicComponent {
    new <T>(options: import('svelte').ComponentConstructorOptions<ReturnType<__sveltets_Render<T>['props']>>): import('svelte').SvelteComponent<ReturnType<__sveltets_Render<T>['props']>, ReturnType<__sveltets_Render<T>['events']>, ReturnType<__sveltets_Render<T>['slots']>> & {
        $$bindings?: ReturnType<__sveltets_Render<T>['bindings']>;
    } & ReturnType<__sveltets_Render<T>['exports']>;
    <T>(internal: unknown, props: ReturnType<__sveltets_Render<T>['props']> & {}): ReturnType<__sveltets_Render<T>['exports']>;
    z_$$bindings?: ReturnType<__sveltets_Render<any>['bindings']>;
}
/** Customizable list virtualizer for advanced usage. See {@link VirtualizerProps} and {@link VirtualizerHandle}. */
declare const Virtualizer: $$IsomorphicComponent;
type Virtualizer<T> = InstanceType<typeof Virtualizer<T>>;
export default Virtualizer;
