/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { isValidElement, useCallback, useState, useMemo, } from 'react';
import { useHistory } from '@docusaurus/router';
import useIsomorphicLayoutEffect from '@docusaurus/useIsomorphicLayoutEffect';
import { useQueryStringValue } from '@docusaurus/theme-common/internal';
import { duplicates, useStorageSlot } from '../index';
// A very rough duck type, but good enough to guard against mistakes while
// allowing customization
function isTabItem(comp) {
    const { props } = comp;
    return !!props && typeof props === 'object' && 'value' in props;
}
export function sanitizeTabsChildren(children) {
    return (React.Children.toArray(children)
        .filter((child) => child !== '\n')
        .map((child) => {
        if (!child || (isValidElement(child) && isTabItem(child))) {
            return child;
        }
        // child.type.name will give non-sensical values in prod because of
        // minification, but we assume it won't throw in prod.
        throw new Error(`Docusaurus error: Bad <Tabs> child <${
        // @ts-expect-error: guarding against unexpected cases
        typeof child.type === 'string' ? child.type : child.type.name}>: all children of the <Tabs> component should be <TabItem>, and every <TabItem> should have a unique "value" prop.`);
    })
        ?.filter(Boolean) ?? []);
}
function extractChildrenTabValues(children) {
    return sanitizeTabsChildren(children).map(({ props: { value, label, attributes, default: isDefault } }) => ({
        value,
        label,
        attributes,
        default: isDefault,
    }));
}
function ensureNoDuplicateValue(values) {
    const dup = duplicates(values, (a, b) => a.value === b.value);
    if (dup.length > 0) {
        throw new Error(`Docusaurus error: Duplicate values "${dup
            .map((a) => a.value)
            .join(', ')}" found in <Tabs>. Every value needs to be unique.`);
    }
}
function useTabValues(props) {
    const { values: valuesProp, children } = props;
    return useMemo(() => {
        const values = valuesProp ?? extractChildrenTabValues(children);
        ensureNoDuplicateValue(values);
        return values;
    }, [valuesProp, children]);
}
function isValidValue({ value, tabValues, }) {
    return tabValues.some((a) => a.value === value);
}
function getInitialStateValue({ defaultValue, tabValues, }) {
    if (tabValues.length === 0) {
        throw new Error('Docusaurus error: the <Tabs> component requires at least one <TabItem> children component');
    }
    if (defaultValue) {
        // Warn user about passing incorrect defaultValue as prop.
        if (!isValidValue({ value: defaultValue, tabValues })) {
            throw new Error(`Docusaurus error: The <Tabs> has a defaultValue "${defaultValue}" but none of its children has the corresponding value. Available values are: ${tabValues
                .map((a) => a.value)
                .join(', ')}. If you intend to show no default tab, use defaultValue={null} instead.`);
        }
        return defaultValue;
    }
    const defaultTabValue = tabValues.find((tabValue) => tabValue.default) ?? tabValues[0];
    if (!defaultTabValue) {
        throw new Error('Unexpected error: 0 tabValues');
    }
    return defaultTabValue.value;
}
function getStorageKey(groupId) {
    if (!groupId) {
        return null;
    }
    return `docusaurus.tab.${groupId}`;
}
function getQueryStringKey({ queryString = false, groupId, }) {
    if (typeof queryString === 'string') {
        return queryString;
    }
    if (queryString === false) {
        return null;
    }
    if (queryString === true && !groupId) {
        throw new Error(`Docusaurus error: The <Tabs> component groupId prop is required if queryString=true, because this value is used as the search param name. You can also provide an explicit value such as queryString="my-search-param".`);
    }
    return groupId ?? null;
}
function useTabQueryString({ queryString = false, groupId, }) {
    const history = useHistory();
    const key = getQueryStringKey({ queryString, groupId });
    const value = useQueryStringValue(key);
    const setValue = useCallback((newValue) => {
        if (!key) {
            return; // no-op
        }
        const searchParams = new URLSearchParams(history.location.search);
        searchParams.set(key, newValue);
        history.replace({ ...history.location, search: searchParams.toString() });
    }, [key, history]);
    return [value, setValue];
}
function useTabStorage({ groupId }) {
    const key = getStorageKey(groupId);
    const [value, storageSlot] = useStorageSlot(key);
    const setValue = useCallback((newValue) => {
        if (!key) {
            return; // no-op
        }
        storageSlot.set(newValue);
    }, [key, storageSlot]);
    return [value, setValue];
}
export function useTabs(props) {
    const { defaultValue, queryString = false, groupId } = props;
    const tabValues = useTabValues(props);
    const [selectedValue, setSelectedValue] = useState(() => getInitialStateValue({ defaultValue, tabValues }));
    const [queryStringValue, setQueryString] = useTabQueryString({
        queryString,
        groupId,
    });
    const [storageValue, setStorageValue] = useTabStorage({
        groupId,
    });
    // We sync valid querystring/storage value to state on change + hydration
    const valueToSync = (() => {
        const value = queryStringValue ?? storageValue;
        if (!isValidValue({ value, tabValues })) {
            return null;
        }
        return value;
    })();
    // Sync in a layout/sync effect is important, for useScrollPositionBlocker
    // See https://github.com/facebook/docusaurus/issues/8625
    useIsomorphicLayoutEffect(() => {
        if (valueToSync) {
            setSelectedValue(valueToSync);
        }
    }, [valueToSync]);
    const selectValue = useCallback((newValue) => {
        if (!isValidValue({ value: newValue, tabValues })) {
            throw new Error(`Can't select invalid tab value=${newValue}`);
        }
        setSelectedValue(newValue);
        setQueryString(newValue);
        setStorageValue(newValue);
    }, [setQueryString, setStorageValue, tabValues]);
    return { selectedValue, selectValue, tabValues };
}
//# sourceMappingURL=tabsUtils.js.map