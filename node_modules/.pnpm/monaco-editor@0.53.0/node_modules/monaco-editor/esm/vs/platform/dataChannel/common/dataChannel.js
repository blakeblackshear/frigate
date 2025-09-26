import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IDataChannelService = createDecorator('dataChannelService');
export class NullDataChannelService {
    getDataChannel(_channelId) {
        return {
            sendData: () => { },
        };
    }
}
//# sourceMappingURL=dataChannel.js.map