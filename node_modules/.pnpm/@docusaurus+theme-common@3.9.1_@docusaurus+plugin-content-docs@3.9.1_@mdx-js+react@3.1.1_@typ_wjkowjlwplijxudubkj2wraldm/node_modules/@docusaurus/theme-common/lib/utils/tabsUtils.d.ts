/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { type ReactNode, type ReactElement } from 'react';
/**
 * TabValue is the "config" of a given Tab
 * Provided through <Tabs> "values" prop or through the children <TabItem> props
 */
export interface TabValue {
    readonly value: string;
    readonly label?: string;
    readonly attributes?: {
        [key: string]: unknown;
    };
    readonly default?: boolean;
}
type TabItem = ReactElement<TabItemProps> | null | false | undefined;
export interface TabsProps {
    readonly lazy?: boolean;
    readonly block?: boolean;
    readonly children: TabItem[] | TabItem;
    readonly defaultValue?: string | null;
    readonly values?: readonly TabValue[];
    readonly groupId?: string;
    readonly className?: string;
    readonly queryString?: string | boolean;
}
export interface TabItemProps {
    readonly children: ReactNode;
    readonly value: string;
    readonly default?: boolean;
    readonly label?: string;
    readonly hidden?: boolean;
    readonly className?: string;
    readonly attributes?: {
        [key: string]: unknown;
    };
}
export declare function sanitizeTabsChildren(children: TabsProps['children']): ReactElement<TabItemProps>[];
export declare function useTabs(props: TabsProps): {
    selectedValue: string;
    selectValue: (value: string) => void;
    tabValues: readonly TabValue[];
};
export {};
//# sourceMappingURL=tabsUtils.d.ts.map