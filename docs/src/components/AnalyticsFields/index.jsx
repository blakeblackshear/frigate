import React from "react";
import schema from "@site/static/frigate-analytics-schema.json";

function resolve(node) {
  if (!node) return node;
  if (node.$ref) return schema.$defs[node.$ref.split("/").pop()];
  if (node.anyOf) {
    const inner = node.anyOf.find((option) => option.type !== "null");
    return inner ? resolve(inner) : node;
  }
  return node;
}

function rows(properties, prefix = "") {
  return Object.entries(properties).flatMap(([name, field]) => {
    const path = prefix ? `${prefix}.${name}` : name;
    const row = {
      path,
      description: field.description,
      isPublic: field["x-public"],
    };
    const target = resolve(field);

    if (target?.properties) return [row, ...rows(target.properties, path)];

    const values = resolve(target?.additionalProperties);
    if (values?.properties)
      return [row, ...rows(values.properties, `${path}.<key>`)];

    const items = resolve(target?.items);
    if (items?.properties) return [row, ...rows(items.properties, `${path}[]`)];

    return [row];
  });
}

export default function AnalyticsFields() {
  return (
    <table>
      <thead>
        <tr>
          <th>Field</th>
          <th>Description</th>
          <th>Public</th>
        </tr>
      </thead>
      <tbody>
        {rows(schema.properties).map((row) => (
          <tr key={row.path}>
            <td>
              <code>{row.path}</code>
            </td>
            <td>{row.description}</td>
            <td>{row.isPublic ? "Yes" : "No"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
