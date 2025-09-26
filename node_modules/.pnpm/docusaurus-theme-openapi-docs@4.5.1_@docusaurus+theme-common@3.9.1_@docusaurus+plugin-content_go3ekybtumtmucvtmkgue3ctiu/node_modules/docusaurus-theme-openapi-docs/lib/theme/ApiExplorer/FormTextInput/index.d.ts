import React from "react";
export interface Props {
    value?: string;
    placeholder?: string;
    password?: boolean;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
}
declare function FormTextInput({ isRequired, value, placeholder, password, onChange, paramName, }: Props): React.JSX.Element;
export default FormTextInput;
