// Description Field Template
import type { DescriptionFieldProps } from "@rjsf/utils";

export function DescriptionFieldTemplate(props: DescriptionFieldProps) {
  const { description, id } = props;

  if (!description) {
    return null;
  }

  return (
    <p id={id} className="text-sm text-muted-foreground">
      {description}
    </p>
  );
}
