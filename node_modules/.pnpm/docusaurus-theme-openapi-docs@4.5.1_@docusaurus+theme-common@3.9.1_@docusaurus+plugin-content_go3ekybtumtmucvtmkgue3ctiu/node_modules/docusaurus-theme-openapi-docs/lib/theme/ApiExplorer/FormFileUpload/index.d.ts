import React from "react";
export interface Props {
    placeholder: string;
    onChange?(file?: File): any;
}
declare function FormFileUpload({ placeholder, onChange }: Props): React.JSX.Element;
export default FormFileUpload;
