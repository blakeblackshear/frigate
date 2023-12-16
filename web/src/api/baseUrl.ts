declare global {
    interface Window {
      baseUrl?: any;
    }
  }

export const baseUrl = `${window.location.protocol}//${window.location.host}${window.baseUrl || '/'}`;