import { ApiItem } from "../types";
export default function json2xml(o: any, tab: any): string;
interface Props {
    id?: string;
    label?: string;
    responses: ApiItem["responses"];
}
export declare function createStatusCodes({ id, label, responses }: Props): string[];
export {};
