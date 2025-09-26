/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
export function useCalendar() {
    const { i18n: { currentLocale, localeConfigs }, } = useDocusaurusContext();
    return localeConfigs[currentLocale].calendar;
}
export function useDateTimeFormat(options = {}) {
    const { i18n: { currentLocale }, } = useDocusaurusContext();
    const calendar = useCalendar();
    return new Intl.DateTimeFormat(currentLocale, {
        calendar,
        ...options,
    });
}
//# sourceMappingURL=IntlUtils.js.map