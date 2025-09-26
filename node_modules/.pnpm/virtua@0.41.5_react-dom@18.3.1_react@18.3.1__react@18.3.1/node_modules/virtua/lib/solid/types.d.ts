import { JSX, ParentComponent } from "solid-js";
export type ViewportComponentAttributes = Pick<JSX.HTMLAttributes<HTMLElement>, "class" | "id" | "role" | "tabIndex" | "onKeyDown" | "onWheel"> & JSX.AriaAttributes & {
    style?: JSX.CSSProperties;
};
export interface CustomContainerComponentProps {
    style: JSX.CSSProperties;
    children: JSX.Element;
    ref?: any | (() => any);
}
export type CustomContainerComponent = ParentComponent<CustomContainerComponentProps>;
/**
 * Props of customized item component for {@link Virtualizer} or {@link WindowVirtualizer}.
 */
export interface CustomItemComponentProps {
    style: JSX.CSSProperties;
    index: number;
    children: JSX.Element;
    ref?: any | (() => any);
}
export type CustomItemComponent = ParentComponent<CustomItemComponentProps>;
