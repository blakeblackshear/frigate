import type {
  ArrayFieldItemTemplateProps,
  FormContextType,
  RJSFSchema,
  StrictRJSFSchema,
} from "@rjsf/utils";
import { getTemplate, getUiOptions } from "@rjsf/utils";

/**
 * Custom ArrayFieldItemTemplate to ensure array item content uses full width
 * while keeping action buttons aligned to the right.
 */
export function ArrayFieldItemTemplate<
  T = unknown,
  S extends StrictRJSFSchema = RJSFSchema,
  F extends FormContextType = FormContextType,
>(props: ArrayFieldItemTemplateProps<T, S, F>) {
  const {
    children,
    buttonsProps,
    displayLabel,
    hasDescription,
    hasToolbar,
    uiSchema,
    registry,
  } = props;

  const uiOptions = getUiOptions<T, S, F>(uiSchema);
  const ArrayFieldItemButtonsTemplate = getTemplate<
    "ArrayFieldItemButtonsTemplate",
    T,
    S,
    F
  >("ArrayFieldItemButtonsTemplate", registry, uiOptions);

  const margin = hasDescription ? -6 : 22;

  return (
    <div className="w-full">
      <div className="mb-2 flex w-full flex-row items-start gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {hasToolbar && (
          <div
            className="flex shrink-0 items-start justify-end gap-2"
            style={{
              marginLeft: "5px",
              marginTop: displayLabel ? `${margin}px` : undefined,
            }}
          >
            <ArrayFieldItemButtonsTemplate {...buttonsProps} />
          </div>
        )}
      </div>
    </div>
  );
}

export default ArrayFieldItemTemplate;
