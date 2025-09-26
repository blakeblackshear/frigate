import React from "react";
export interface Props {
    label?: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    children?: React.ReactNode;
}
declare function FloatingButton({ label, onClick, children }: Props): React.JSX.Element;
export default FloatingButton;
