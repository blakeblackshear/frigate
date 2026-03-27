import React from "react";
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

export default function ConfigTabs({ children }) {
  return (
    <Tabs
      groupId="config-method"
      defaultValue="ui"
      values={[
        { label: "Frigate UI", value: "ui" },
        { label: "YAML", value: "yaml" },
      ]}
    >
      {children}
    </Tabs>
  );
}
