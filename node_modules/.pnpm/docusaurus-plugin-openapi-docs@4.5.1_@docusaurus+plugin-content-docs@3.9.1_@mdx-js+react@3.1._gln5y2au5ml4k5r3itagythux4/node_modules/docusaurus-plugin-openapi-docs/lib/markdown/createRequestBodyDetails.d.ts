import { MediaTypeObject } from "../openapi/types";
interface Props {
    title: string;
    body: {
        content?: {
            [key: string]: MediaTypeObject;
        };
        description?: string;
        required?: boolean;
    };
}
export declare function createRequestBodyDetails({ title, body }: Props): string[];
export {};
