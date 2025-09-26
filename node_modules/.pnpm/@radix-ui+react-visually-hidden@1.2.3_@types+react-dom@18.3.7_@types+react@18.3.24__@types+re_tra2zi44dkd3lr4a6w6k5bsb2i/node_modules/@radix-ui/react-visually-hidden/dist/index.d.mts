import * as React from 'react';
import { Primitive } from '@radix-ui/react-primitive';

declare const VISUALLY_HIDDEN_STYLES: Readonly<{
    position: "absolute";
    border: 0;
    width: 1;
    height: 1;
    padding: 0;
    margin: -1;
    overflow: "hidden";
    clip: "rect(0, 0, 0, 0)";
    whiteSpace: "nowrap";
    wordWrap: "normal";
}>;
type PrimitiveSpanProps = React.ComponentPropsWithoutRef<typeof Primitive.span>;
interface VisuallyHiddenProps extends PrimitiveSpanProps {
}
declare const VisuallyHidden: React.ForwardRefExoticComponent<VisuallyHiddenProps & React.RefAttributes<HTMLSpanElement>>;
declare const Root: React.ForwardRefExoticComponent<VisuallyHiddenProps & React.RefAttributes<HTMLSpanElement>>;

export { Root, VISUALLY_HIDDEN_STYLES, VisuallyHidden, type VisuallyHiddenProps };
