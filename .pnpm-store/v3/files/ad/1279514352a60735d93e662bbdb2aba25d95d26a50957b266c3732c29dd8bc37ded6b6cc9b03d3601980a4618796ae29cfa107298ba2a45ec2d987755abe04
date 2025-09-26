export type FanOutUnsubscribe = () => void;
export type FanOutListener<D> = (data: D) => void;
export declare class FanOut<D> {
    readonly listeners: Set<FanOutListener<D>>;
    emit(data: D): void;
    listen(listener: FanOutListener<D>): FanOutUnsubscribe;
}
