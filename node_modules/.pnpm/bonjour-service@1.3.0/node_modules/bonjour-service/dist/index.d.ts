import Browser, { BrowserConfig } from './lib/browser';
import Service, { ServiceConfig, ServiceReferer } from './lib/service';
export declare class Bonjour {
    private server;
    private registry;
    constructor(opts?: Partial<ServiceConfig>, errorCallback?: Function | undefined);
    publish(opts: ServiceConfig): Service;
    unpublishAll(callback?: CallableFunction | undefined): void;
    find(opts?: BrowserConfig | null, onup?: (service: Service) => void): Browser;
    findOne(opts?: BrowserConfig | null, timeout?: number, callback?: CallableFunction): Browser;
    destroy(callback?: CallableFunction): void;
}
export { Service, ServiceReferer, ServiceConfig, Browser, BrowserConfig };
export default Bonjour;
