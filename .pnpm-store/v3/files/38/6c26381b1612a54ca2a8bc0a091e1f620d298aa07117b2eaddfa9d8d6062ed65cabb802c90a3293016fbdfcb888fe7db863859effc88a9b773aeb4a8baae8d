declare namespace nosleep {
  class NoSleep {
    constructor();

    get isEnabled(): boolean;
    enable(): Promise<any>;
    disable(): void;
    _addSourceToVideo(
      element: HTMLElement,
      type: string,
      dataURI: string
    ): void;
  }
}

declare global {
  interface Window {
    NoSleep: typeof nosleep.NoSleep;
  }
}

export default nosleep.NoSleep;
