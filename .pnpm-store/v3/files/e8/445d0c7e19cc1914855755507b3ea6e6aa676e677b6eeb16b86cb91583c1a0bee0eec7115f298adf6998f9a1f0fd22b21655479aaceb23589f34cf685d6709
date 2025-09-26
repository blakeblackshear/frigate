import type { IconifyIcon, IconifyJSON } from '@iconify/types';
import type { IconifyIconCustomisations } from '@iconify/utils';
interface AsyncIconLoader {
    name: string;
    loader: () => Promise<IconifyJSON>;
}
interface SyncIconLoader {
    name: string;
    icons: IconifyJSON;
}
export type IconLoader = AsyncIconLoader | SyncIconLoader;
export declare const unknownIcon: IconifyIcon;
export declare const registerIconPacks: (iconLoaders: IconLoader[]) => void;
export declare const isIconAvailable: (iconName: string) => Promise<boolean>;
export declare const getIconSVG: (iconName: string, customisations?: IconifyIconCustomisations & {
    fallbackPrefix?: string;
}, extraAttributes?: Record<string, string>) => Promise<string>;
export {};
