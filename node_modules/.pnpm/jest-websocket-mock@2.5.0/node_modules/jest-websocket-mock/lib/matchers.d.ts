import { DeserializedMessage } from "./websocket";
declare type ReceiveMessageOptions = {
    timeout?: number;
};
declare global {
    namespace jest {
        interface Matchers<R, T> {
            toReceiveMessage<TMessage = object>(message: DeserializedMessage<TMessage>, options?: ReceiveMessageOptions): Promise<R>;
            toHaveReceivedMessages<TMessage = object>(messages: Array<DeserializedMessage<TMessage>>): R;
        }
    }
}
export {};
