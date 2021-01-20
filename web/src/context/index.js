import { createContext } from 'preact';

export const Config = createContext({});

export const ApiHost = createContext(import.meta.env.SNOWPACK_PUBLIC_API_HOST || window.baseUrl || '');
