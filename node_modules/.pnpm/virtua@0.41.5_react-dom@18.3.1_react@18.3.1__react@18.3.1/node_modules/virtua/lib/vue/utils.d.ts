import { CSSProperties } from "vue";
export type ItemProps = (payload: {
    item: any;
    index: number;
}) => {
    [key: string]: any;
    style?: CSSProperties;
    class?: string;
} | undefined;
