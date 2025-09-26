import type { HTMLAttributes, AriaAttributes } from "svelte/elements";
export type ViewportComponentAttributes = Pick<HTMLAttributes<HTMLElement>, "class" | "style" | "id" | "role" | "tabindex"> & AriaAttributes;
