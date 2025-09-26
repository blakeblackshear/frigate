/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React, { cloneElement, ReactElement, useEffect, useRef } from "react";

import {
  sanitizeTabsChildren,
  type TabProps,
  useScrollPositionBlocker,
  useTabs,
} from "@docusaurus/theme-common/internal";
import { TabItemProps } from "@docusaurus/theme-common/lib/utils/tabsUtils";
import useIsBrowser from "@docusaurus/useIsBrowser";
import { Language } from "@theme/ApiExplorer/CodeSnippets";
import clsx from "clsx";

export interface Props {
  action: {
    [key: string]: React.Dispatch<any>;
  };
  currentLanguage: Language;
  languageSet: Language[];
  includeVariant: boolean;
}

export interface CodeTabsProps extends Props, TabProps {
  includeSample?: boolean;
}

function TabList({
  action,
  currentLanguage,
  languageSet,
  includeVariant,
  includeSample,
  className,
  block,
  selectedValue,
  selectValue,
  tabValues,
}: CodeTabsProps & ReturnType<typeof useTabs>) {
  const tabRefs = useRef<(HTMLLIElement | null)[]>([]);
  const tabsScrollContainerRef = useRef<any>(null);
  const { blockElementScrollPositionUntilNextRender } =
    useScrollPositionBlocker();

  useEffect(() => {
    const activeTab = tabRefs.current.find(
      (tab) => tab?.getAttribute("aria-selected") === "true"
    );

    if (activeTab && tabsScrollContainerRef.current) {
      const container = tabsScrollContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const activeTabRect = activeTab.getBoundingClientRect();

      // Calculate the distance to scroll to align active tab to the left
      const glowOffset = 3;
      const scrollOffset =
        activeTabRect.left -
        containerRect.left +
        container.scrollLeft -
        glowOffset;

      // Check if the active tab is not already at the left position

      if (Math.abs(scrollOffset - container.scrollLeft) > 4) {
        // Adjust the scroll of the container
        container.scrollLeft = scrollOffset;
      }
    }
  }, []);

  const handleTabChange = (
    event:
      | React.FocusEvent<HTMLLIElement>
      | React.MouseEvent<HTMLLIElement>
      | React.KeyboardEvent<HTMLLIElement>
  ) => {
    const newTab = event.currentTarget;
    const newTabIndex = tabRefs.current.indexOf(newTab);
    const newTabValue = tabValues[newTabIndex]!.value;

    if (newTabValue !== selectedValue) {
      blockElementScrollPositionUntilNextRender(newTab);
      selectValue(newTabValue);
    }

    if (action) {
      let newLanguage: Language;
      if (currentLanguage && includeVariant) {
        newLanguage = languageSet.filter(
          (lang: Language) => lang.language === currentLanguage
        )[0];
        newLanguage.variant = newTabValue;
        action.setSelectedVariant(newTabValue.toLowerCase());
      } else if (currentLanguage && includeSample) {
        newLanguage = languageSet.filter(
          (lang: Language) => lang.language === currentLanguage
        )[0];
        newLanguage.sample = newTabValue;
        action.setSelectedSample(newTabValue);
      } else {
        newLanguage = languageSet.filter(
          (lang: Language) => lang.language === newTabValue
        )[0];
        action.setSelectedVariant(newLanguage.variants[0].toLowerCase());
        action.setSelectedSample(newLanguage.sample);
      }
      action.setLanguage(newLanguage);
    }
  };

  const handleKeydown = (event: React.KeyboardEvent<HTMLLIElement>) => {
    let focusElement: HTMLLIElement | null = null;

    switch (event.key) {
      case "Enter": {
        handleTabChange(event);
        break;
      }
      case "ArrowRight": {
        const nextTab = tabRefs.current.indexOf(event.currentTarget) + 1;
        focusElement = tabRefs.current[nextTab] ?? tabRefs.current[0]!;
        break;
      }
      case "ArrowLeft": {
        const prevTab = tabRefs.current.indexOf(event.currentTarget) - 1;
        focusElement =
          tabRefs.current[prevTab] ??
          tabRefs.current[tabRefs.current.length - 1]!;
        break;
      }
      default:
        break;
    }

    focusElement?.focus();
  };

  return (
    <ul
      role="tablist"
      aria-orientation="horizontal"
      className={clsx(
        "tabs",
        "openapi-tabs__code-list-container",
        {
          "tabs--block": block,
        },
        className
      )}
      ref={tabsScrollContainerRef}
    >
      {tabValues.map(({ value, label, attributes }) => (
        <li
          // TODO extract TabListItem
          role="tab"
          tabIndex={selectedValue === value ? 0 : -1}
          aria-selected={selectedValue === value}
          key={value}
          ref={(tabControl) => {
            if (tabControl) {
              tabRefs.current.push(tabControl);
            }
          }}
          onKeyDown={handleKeydown}
          onClick={handleTabChange}
          {...attributes}
          className={clsx(
            "tabs__item",
            "openapi-tabs__code-item",
            attributes?.className as string,
            {
              active: selectedValue === value,
            }
          )}
        >
          <span>{label ?? value}</span>
        </li>
      ))}
    </ul>
  );
}

function TabContent({
  lazy,
  children,
  selectedValue,
}: CodeTabsProps & ReturnType<typeof useTabs>): React.JSX.Element | null {
  const childTabs = (Array.isArray(children) ? children : [children]).filter(
    Boolean
  ) as ReactElement<TabItemProps>[];
  if (lazy) {
    const selectedTabItem = childTabs.find(
      (tabItem) => tabItem.props.value === selectedValue
    );
    if (!selectedTabItem) {
      // fail-safe or fail-fast? not sure what's best here
      return null;
    }
    return cloneElement(selectedTabItem, { className: "margin-top--md" });
  }
  return (
    <div className="margin-top--md openapi-tabs__code-content">
      {childTabs.map((tabItem, i) =>
        cloneElement(tabItem, {
          key: i,
          hidden: tabItem.props.value !== selectedValue,
        })
      )}
    </div>
  );
}

function TabsComponent(props: CodeTabsProps & Props): React.JSX.Element {
  const tabs = useTabs(props);
  const { className } = props;

  return (
    <div
      className={clsx("tabs-container openapi-tabs__code-container", className)}
    >
      <TabList {...props} {...tabs} />
      <TabContent {...props} {...tabs} />
    </div>
  );
}

export default function CodeTabs(
  props: CodeTabsProps & Props
): React.JSX.Element {
  const isBrowser = useIsBrowser();
  return (
    <TabsComponent
      // Remount tabs after hydration
      // Temporary fix for https://github.com/facebook/docusaurus/issues/5653
      key={String(isBrowser)}
      {...props}
    >
      {sanitizeTabsChildren(props.children)}
    </TabsComponent>
  );
}
