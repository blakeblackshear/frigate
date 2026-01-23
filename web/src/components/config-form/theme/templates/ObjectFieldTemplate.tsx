// Object Field Template - renders nested object fields
import type { ObjectFieldTemplateProps } from "@rjsf/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";

export function ObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { title, description, properties } = props;

  // Check if this is a root-level object
  const isRoot = !title;
  const [isOpen, setIsOpen] = useState(true);

  // Check for advanced section grouping
  const advancedProps = properties.filter(
    (p) => p.content.props.uiSchema?.["ui:options"]?.advanced === true,
  );
  const regularProps = properties.filter(
    (p) => p.content.props.uiSchema?.["ui:options"]?.advanced !== true,
  );

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Root level renders children directly
  if (isRoot) {
    return (
      <div className="space-y-6">
        {regularProps.map((element) => (
          <div key={element.name}>{element.content}</div>
        ))}

        {advancedProps.length > 0 && (
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2">
                {showAdvanced ? (
                  <LuChevronDown className="h-4 w-4" />
                ) : (
                  <LuChevronRight className="h-4 w-4" />
                )}
                Advanced Settings ({advancedProps.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {advancedProps.map((element) => (
                <div key={element.name}>{element.content}</div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    );
  }

  // Nested objects render as collapsible cards
  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer transition-colors hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{title}</CardTitle>
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              {isOpen ? (
                <LuChevronDown className="h-4 w-4" />
              ) : (
                <LuChevronRight className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {regularProps.map((element) => (
              <div key={element.name}>{element.content}</div>
            ))}

            {advancedProps.length > 0 && (
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2"
                  >
                    {showAdvanced ? (
                      <LuChevronDown className="h-4 w-4" />
                    ) : (
                      <LuChevronRight className="h-4 w-4" />
                    )}
                    Advanced ({advancedProps.length})
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {advancedProps.map((element) => (
                    <div key={element.name}>{element.content}</div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
