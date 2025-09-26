import { ComponentType, CSSProperties, LegacyRef, ReactNode } from "react";
export type ViewportComponentAttributes = Pick<React.HTMLAttributes<HTMLElement>, "className" | "style" | "id" | "role" | "tabIndex" | "onKeyDown" | "onWheel"> & React.AriaAttributes;
export interface CustomContainerComponentProps {
    style: CSSProperties;
    children: ReactNode;
    /**
     * only available after React 19
     */
    ref?: LegacyRef<any>;
}
export type CustomContainerComponent = ComponentType<CustomContainerComponentProps>;
/**
 * Props of customized item component for {@link Virtualizer} or {@link WindowVirtualizer}.
 */
export interface CustomItemComponentProps {
    style: CSSProperties;
    index: number;
    children: ReactNode;
    /**
     * only available after React 19
     */
    ref?: LegacyRef<any>;
}
export type CustomItemComponent = ComponentType<CustomItemComponentProps>;
