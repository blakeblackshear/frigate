"use strict";
/* ============================================================================
 * Copyright (c) Palo Alto Networks
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * ========================================================================== */
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CodeTabs;
const react_1 = __importStar(require("react"));
const internal_1 = require("@docusaurus/theme-common/internal");
const useIsBrowser_1 = __importDefault(require("@docusaurus/useIsBrowser"));
const clsx_1 = __importDefault(require("clsx"));
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
}) {
  const tabRefs = (0, react_1.useRef)([]);
  const tabsScrollContainerRef = (0, react_1.useRef)(null);
  const { blockElementScrollPositionUntilNextRender } = (0,
  internal_1.useScrollPositionBlocker)();
  (0, react_1.useEffect)(() => {
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
  const handleTabChange = (event) => {
    const newTab = event.currentTarget;
    const newTabIndex = tabRefs.current.indexOf(newTab);
    const newTabValue = tabValues[newTabIndex].value;
    if (newTabValue !== selectedValue) {
      blockElementScrollPositionUntilNextRender(newTab);
      selectValue(newTabValue);
    }
    if (action) {
      let newLanguage;
      if (currentLanguage && includeVariant) {
        newLanguage = languageSet.filter(
          (lang) => lang.language === currentLanguage
        )[0];
        newLanguage.variant = newTabValue;
        action.setSelectedVariant(newTabValue.toLowerCase());
      } else if (currentLanguage && includeSample) {
        newLanguage = languageSet.filter(
          (lang) => lang.language === currentLanguage
        )[0];
        newLanguage.sample = newTabValue;
        action.setSelectedSample(newTabValue);
      } else {
        newLanguage = languageSet.filter(
          (lang) => lang.language === newTabValue
        )[0];
        action.setSelectedVariant(newLanguage.variants[0].toLowerCase());
        action.setSelectedSample(newLanguage.sample);
      }
      action.setLanguage(newLanguage);
    }
  };
  const handleKeydown = (event) => {
    let focusElement = null;
    switch (event.key) {
      case "Enter": {
        handleTabChange(event);
        break;
      }
      case "ArrowRight": {
        const nextTab = tabRefs.current.indexOf(event.currentTarget) + 1;
        focusElement = tabRefs.current[nextTab] ?? tabRefs.current[0];
        break;
      }
      case "ArrowLeft": {
        const prevTab = tabRefs.current.indexOf(event.currentTarget) - 1;
        focusElement =
          tabRefs.current[prevTab] ??
          tabRefs.current[tabRefs.current.length - 1];
        break;
      }
      default:
        break;
    }
    focusElement?.focus();
  };
  return react_1.default.createElement(
    "ul",
    {
      role: "tablist",
      "aria-orientation": "horizontal",
      className: (0, clsx_1.default)(
        "tabs",
        "openapi-tabs__code-list-container",
        {
          "tabs--block": block,
        },
        className
      ),
      ref: tabsScrollContainerRef,
    },
    tabValues.map(({ value, label, attributes }) =>
      react_1.default.createElement(
        "li",
        {
          // TODO extract TabListItem
          role: "tab",
          tabIndex: selectedValue === value ? 0 : -1,
          "aria-selected": selectedValue === value,
          key: value,
          ref: (tabControl) => {
            if (tabControl) {
              tabRefs.current.push(tabControl);
            }
          },
          onKeyDown: handleKeydown,
          onClick: handleTabChange,
          ...attributes,
          className: (0, clsx_1.default)(
            "tabs__item",
            "openapi-tabs__code-item",
            attributes?.className,
            {
              active: selectedValue === value,
            }
          ),
        },
        react_1.default.createElement("span", null, label ?? value)
      )
    )
  );
}
function TabContent({ lazy, children, selectedValue }) {
  const childTabs = (Array.isArray(children) ? children : [children]).filter(
    Boolean
  );
  if (lazy) {
    const selectedTabItem = childTabs.find(
      (tabItem) => tabItem.props.value === selectedValue
    );
    if (!selectedTabItem) {
      // fail-safe or fail-fast? not sure what's best here
      return null;
    }
    return (0, react_1.cloneElement)(selectedTabItem, {
      className: "margin-top--md",
    });
  }
  return react_1.default.createElement(
    "div",
    { className: "margin-top--md openapi-tabs__code-content" },
    childTabs.map((tabItem, i) =>
      (0, react_1.cloneElement)(tabItem, {
        key: i,
        hidden: tabItem.props.value !== selectedValue,
      })
    )
  );
}
function TabsComponent(props) {
  const tabs = (0, internal_1.useTabs)(props);
  const { className } = props;
  return react_1.default.createElement(
    "div",
    {
      className: (0, clsx_1.default)(
        "tabs-container openapi-tabs__code-container",
        className
      ),
    },
    react_1.default.createElement(TabList, { ...props, ...tabs }),
    react_1.default.createElement(TabContent, { ...props, ...tabs })
  );
}
function CodeTabs(props) {
  const isBrowser = (0, useIsBrowser_1.default)();
  return react_1.default.createElement(
    TabsComponent,
    // Remount tabs after hydration
    // Temporary fix for https://github.com/facebook/docusaurus/issues/5653
    {
      // Remount tabs after hydration
      // Temporary fix for https://github.com/facebook/docusaurus/issues/5653
      key: String(isBrowser),
      ...props,
    },
    (0, internal_1.sanitizeTabsChildren)(props.children)
  );
}
