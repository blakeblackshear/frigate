import React, { Children, cloneElement } from "react";
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

export default function ConfigTabs({ children }) {
  const wrapped = Children.map(children, (child) => {
    if (child?.props?.value === "ui") {
      return cloneElement(child, {
        className: "config-tab-ui",
      });
    }
    if (child?.props?.value === "yaml") {
      return cloneElement(child, {
        className: "config-tab-yaml",
      });
    }
    return child;
  });

  return (
    <div className="config-tabs-wrapper">
      <Tabs
        groupId="config-method"
        defaultValue="ui"
        values={[
          { label: "Frigate UI", value: "ui" },
          { label: "YAML", value: "yaml" },
        ]}
      >
        {wrapped}
      </Tabs>
    </div>
  );
}
