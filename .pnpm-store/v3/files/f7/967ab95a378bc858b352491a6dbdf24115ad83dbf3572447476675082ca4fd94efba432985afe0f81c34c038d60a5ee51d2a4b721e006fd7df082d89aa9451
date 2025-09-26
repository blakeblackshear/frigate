/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */

import React, {
  cloneElement,
  useEffect,
  useState,
  useRef,
  ReactElement,
} from "react";

import {
  sanitizeTabsChildren,
  TabProps,
  useScrollPositionBlocker,
  useTabs,
} from "@docusaurus/theme-common/internal";
import { TabItemProps } from "@docusaurus/theme-common/lib/utils/tabsUtils";
import useIsBrowser from "@docusaurus/useIsBrowser";
import clsx from "clsx";

function TabList({
  className,
  block,
  selectedValue,
  selectValue,
  tabValues,
}: TabProps & ReturnType<typeof useTabs>) {
  const tabRefs: (HTMLLIElement | null)[] = [];
  const { blockElementScrollPositionUntilNextRender } =
    useScrollPositionBlocker();

  const handleTabChange = (
    event:
      | React.FocusEvent<HTMLLIElement>
      | React.MouseEvent<HTMLLIElement>
      | React.KeyboardEvent<HTMLLIElement>
  ) => {
    const newTab = event.currentTarget;
    const newTabIndex = tabRefs.indexOf(newTab);
    const newTabValue = tabValues[newTabIndex].value;

    if (newTabValue !== selectedValue) {
      blockElementScrollPositionUntilNextRender(newTab);
      selectValue(newTabValue);
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
        const nextTab = tabRefs.indexOf(event.currentTarget) + 1;
        focusElement = tabRefs[nextTab] ?? tabRefs[0]!;
        break;
      }
      case "ArrowLeft": {
        const prevTab = tabRefs.indexOf(event.currentTarget) - 1;
        focusElement = tabRefs[prevTab] ?? tabRefs[tabRefs.length - 1]!;
        break;
      }
      default:
        break;
    }

    focusElement?.focus();
  };

  const tabItemListContainerRef = useRef<HTMLUListElement>(null);
  const [showTabArrows, setShowTabArrows] = useState<boolean>(false);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        requestAnimationFrame(() => {
          if (entry.target.clientWidth < entry.target.scrollWidth) {
            setShowTabArrows(true);
          } else {
            setShowTabArrows(false);
          }
        });
      }
    });

    resizeObserver.observe(tabItemListContainerRef.current!);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const handleRightClick = () => {
    tabItemListContainerRef.current!.scrollLeft += 90;
  };

  const handleLeftClick = () => {
    tabItemListContainerRef.current!.scrollLeft -= 90;
  };

  return (
    <div className="tabs__container">
      <div className="openapi-tabs__operation-container">
        {showTabArrows && (
          <button
            className={clsx("openapi-tabs__arrow", "left")}
            onClick={handleLeftClick}
          />
        )}
        <ul
          ref={tabItemListContainerRef}
          role="tablist"
          aria-orientation="horizontal"
          className={clsx(
            "openapi-tabs__operation-list-container",
            "tabs",
            {
              "tabs--block": block,
            },
            className
          )}
        >
          {tabValues.map(({ value, label, attributes }) => {
            return (
              <li
                // TODO extract TabListItem
                role="tab"
                tabIndex={selectedValue === value ? 0 : -1}
                aria-selected={selectedValue === value}
                key={value}
                ref={(tabControl) => {
                  tabRefs.push(tabControl);
                }}
                onKeyDown={handleKeydown}
                onFocus={handleTabChange}
                onClick={(e) => handleTabChange(e)}
                {...attributes}
                className={clsx(
                  "tabs__item",
                  "openapi-tabs__operation-item",
                  attributes?.className as string,
                  {
                    active: selectedValue === value,
                  }
                )}
              >
                {label ?? value}
              </li>
            );
          })}
        </ul>
        {showTabArrows && (
          <button
            className={clsx("openapi-tabs__arrow", "right")}
            onClick={handleRightClick}
          />
        )}
      </div>
    </div>
  );
}
function TabContent({
  lazy,
  children,
  selectedValue,
}: TabProps & ReturnType<typeof useTabs>): React.JSX.Element | null {
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
    <div className="margin-top--md">
      {childTabs.map((tabItem, i) =>
        cloneElement(tabItem, {
          key: i,
          hidden: tabItem.props.value !== selectedValue,
        })
      )}
    </div>
  );
}
function TabsComponent(props: TabProps): React.JSX.Element {
  const tabs = useTabs(props);
  return (
    <div className="tabs-container">
      <TabList {...props} {...tabs} />
      <TabContent {...props} {...tabs} />
    </div>
  );
}
export default function OperationTabs(props: TabProps): React.JSX.Element {
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
