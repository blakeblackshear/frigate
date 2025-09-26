import * as React from 'react';
import { Primitive } from '@radix-ui/react-primitive';

type PrimitiveSvgProps = React.ComponentPropsWithoutRef<typeof Primitive.svg>;
interface ArrowProps extends PrimitiveSvgProps {
}
declare const Arrow: React.ForwardRefExoticComponent<ArrowProps & React.RefAttributes<SVGSVGElement>>;
declare const Root: React.ForwardRefExoticComponent<ArrowProps & React.RefAttributes<SVGSVGElement>>;

export { Arrow, type ArrowProps, Root };
