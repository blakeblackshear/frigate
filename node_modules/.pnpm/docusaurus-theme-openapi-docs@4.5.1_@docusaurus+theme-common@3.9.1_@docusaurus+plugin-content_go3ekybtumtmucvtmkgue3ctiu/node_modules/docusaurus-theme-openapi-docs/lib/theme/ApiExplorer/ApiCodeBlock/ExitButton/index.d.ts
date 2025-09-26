import React from "react";
export interface Props {
    readonly className: string;
    readonly handler: () => void;
}
export default function ExitButton({ className, handler, }: Props): React.JSX.Element;
