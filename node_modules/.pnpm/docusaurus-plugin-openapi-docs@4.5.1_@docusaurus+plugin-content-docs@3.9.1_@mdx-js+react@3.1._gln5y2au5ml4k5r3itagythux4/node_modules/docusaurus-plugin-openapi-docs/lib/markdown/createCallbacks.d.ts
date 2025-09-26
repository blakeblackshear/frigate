import { ApiItem } from "../types";
interface Props {
    callbacks: ApiItem["callbacks"];
}
export declare function createCallbacks({ callbacks }: Props): string | undefined;
export {};
