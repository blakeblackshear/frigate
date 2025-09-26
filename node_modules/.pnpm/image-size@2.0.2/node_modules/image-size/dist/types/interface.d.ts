interface ISize {
    width: number;
    height: number;
    orientation?: number;
    type?: string;
}
type ISizeCalculationResult = {
    images?: ISize[];
} & ISize;
interface IImage {
    validate: (input: Uint8Array) => boolean;
    calculate: (input: Uint8Array) => ISizeCalculationResult;
}

export type { IImage, ISize, ISizeCalculationResult };
