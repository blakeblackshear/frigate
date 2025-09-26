import React, { ReactNode } from "react";
export interface Props {
    children?: ReactNode;
    collapsible?: boolean;
    name?: string;
    qualifierMessage?: string | undefined;
    required?: boolean;
    schemaName?: string;
    schema?: any;
    discriminator?: boolean;
}
export default function SchemaItem(props: Props): React.JSX.Element;
