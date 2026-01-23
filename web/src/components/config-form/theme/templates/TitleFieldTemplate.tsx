// Title Field Template
import type { TitleFieldProps } from "@rjsf/utils";

export function TitleFieldTemplate(props: TitleFieldProps) {
  const { title, id, required } = props;

  if (!title) {
    return null;
  }

  return (
    <h3 id={id} className="text-lg font-semibold">
      {title}
      {required && <span className="ml-1 text-destructive">*</span>}
    </h3>
  );
}
