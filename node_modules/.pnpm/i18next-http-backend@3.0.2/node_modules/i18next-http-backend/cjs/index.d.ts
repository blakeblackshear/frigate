import { BackendModule, MultiReadCallback, ReadCallback, ResourceKey } from "i18next";

type LoadPathOption =
  | string
  | ((lngs: string[], namespaces: string[]) => string)
  | ((lngs: string[], namespaces: string[]) => Promise<string>);

type AddPathOption =
  | string
  | ((lng: string, namespace: string) => string);

type FetchFunction = (input: string, init: RequestInit) => Promise<Response> | void

export interface HttpBackendOptions {
  /**
   * Use an alternative fetch function that acts like an interecept, (usefull for low level mocks/simulations)
   *
   * This option is not called if:
   *
   * 1. There is an custom value set for the "request" property in this options object.
   * 2. The backend selected xmlHttpRequest over fetch
   *
   * If the function is called and it returns anything BUT a promise the fetch or xmlHttpRequest will be subsequentially called
   *
   */
  alternateFetch?: FetchFunction;
  /**
   * path where resources get loaded from, or a function
   * returning a path:
   * function(lngs, namespaces) { return customPath; }
   * the returned path will interpolate lng, ns if provided like giving a static path
   */
  loadPath?: LoadPathOption;
  /**
   * path to post missing resources, must be `string` or a `function` returning a path:
   * function(lng, namespace) { return customPath; }
   */
  addPath?: AddPathOption;
  /**
   * parse data after it has been fetched
   * in example use https://www.npmjs.com/package/json5 or https://www.npmjs.com/package/jsonc-parser
   * here it removes the letter a from the json (bad idea)
   */
  parse?(
    data: string,
    languages?: string | string[],
    namespaces?: string | string[]
  ): { [key: string]: any };
  /**
   * parse data before it has been sent by addPath
   */
  parsePayload?(
    namespace: string,
    key: string,
    fallbackValue?: string
  ): { [key: string]: any };
  /**
   * parse data before it has been sent by loadPath
   * if value returned it will send a POST request
   */
  parseLoadPayload?(
    languages: string[],
    namespaces: string[]
  ): { [key: string]: any } | undefined;
  /**
   * allow cross domain requests
   */
  crossDomain?: boolean;
  /**
   * allow credentials on cross domain requests
   */
  withCredentials?: boolean;
  /**
   * define a custom xhr function
   * can be used to support XDomainRequest in IE 8 and 9
   */
  request?(
    options: HttpBackendOptions,
    url: string,
    payload: {} | string,
    callback: RequestCallback
  ): void;
  /**
   * adds parameters to resource URL. 'example.com' -> 'example.com?v=1.3.5'
   */
  queryStringParams?: { [key: string]: string };

  /**
   * allows an object containing custom headers or a function that when called returns
   * an object of custom headers
   */
  customHeaders?: { [key: string]: string } | (() => { [key: string]: string });

  /**
   * can be used to reload resources in a specific
   * interval (useful in server environments)
   */
  reloadInterval?: false | number;

  /**
   * fetch api request options, can be a function
   */
  requestOptions?: RequestInit | ((payload: {} | string) => RequestInit);
}

type RequestCallback = (error: any | undefined | null, response: RequestResponse | undefined | null) => void;

interface RequestResponse {
  status: number;
  data: ResourceKey;
}

export default class I18NextHttpBackend
  implements BackendModule<HttpBackendOptions>
{
  static type: "backend";
  constructor(services?: any, options?: HttpBackendOptions);
  init(services?: any, options?: HttpBackendOptions): void;
  readMulti?(
    languages: string[],
    namespaces: string[],
    callback: MultiReadCallback
  ): void;
  read(language: string, namespace: string, callback: ReadCallback): void;
  loadUrl(
    url: string,
    callback: ReadCallback,
    languages?: string | string[],
    namespaces?: string | string[]
  ): void;
  create?(
    languages: string[],
    namespace: string,
    key: string,
    fallbackValue: string
  ): void;
  type: "backend";
  services: any;
  options: HttpBackendOptions;
}
