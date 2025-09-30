/**
 * Generic configuration section component
 * Reusable for any top-level config section
 */

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SchemaFormRenderer } from "../SchemaFormRenderer";
import { ConfigSchema, ObjectSchema } from "@/types/configSchema";

export interface GenericSectionProps {
  title: string;
  description?: string;
  schema: ConfigSchema;
  propertyName: string;
  icon?: React.ReactNode;
}

/**
 * GenericSection renders any top-level configuration section
 */
export function GenericSection({
  title,
  description,
  schema,
  propertyName,
  icon,
}: GenericSectionProps) {
  const sectionSchema = React.useMemo(() => {
    const prop = schema.properties?.[propertyName];
    if (prop && "type" in prop) {
      return prop;
    }
    return undefined;
  }, [schema, propertyName]);

  if (!sectionSchema) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            Schema not found for {propertyName}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-6">
              <SchemaFormRenderer
                schema={sectionSchema}
                path={propertyName}
                rootSchema={schema}
              />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}