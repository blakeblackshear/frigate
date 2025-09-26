type PerfLoggerAPI = {
    start: (label: string) => void;
    end: (label: string) => void;
    log: (message: string) => void;
    async: <Result>(label: string, asyncFn: () => Result | Promise<Result>) => Promise<Result>;
};
export declare const PerfLogger: PerfLoggerAPI;
export {};
//# sourceMappingURL=perfLogger.d.ts.map