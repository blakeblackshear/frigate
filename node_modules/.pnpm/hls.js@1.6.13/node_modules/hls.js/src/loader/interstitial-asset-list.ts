import {
  type AssetListJSON,
  getInterstitialUrl,
  type InterstitialEventWithAssetList,
} from './interstitial-event';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import type { InterstitialEvent } from './interstitial-event';
import type Hls from '../hls';
import type { ErrorData } from '../types/events';
import type {
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderContext,
  LoaderResponse,
  LoaderStats,
} from '../types/loader';

export class AssetListLoader {
  private hls: Hls;

  constructor(hls: Hls) {
    this.hls = hls;
  }

  destroy() {
    // @ts-ignore
    this.hls = null;
  }

  loadAssetList(
    interstitial: InterstitialEventWithAssetList,
    hlsStartOffset: number | undefined,
  ): Loader<LoaderContext> | undefined {
    const assetListUrl = interstitial.assetListUrl;
    let url: URL;
    try {
      url = getInterstitialUrl(
        assetListUrl,
        this.hls.sessionId,
        interstitial.baseUrl,
      );
    } catch (error) {
      const errorData = this.assignAssetListError(
        interstitial,
        ErrorDetails.ASSET_LIST_LOAD_ERROR,
        error,
        assetListUrl,
      );
      this.hls.trigger(Events.ERROR, errorData);
      return;
    }
    if (hlsStartOffset && url.protocol !== 'data:') {
      url.searchParams.set('_HLS_start_offset', '' + hlsStartOffset);
    }
    const config = this.hls.config;
    const Loader = config.loader;
    const loader = new Loader(config) as Loader<LoaderContext>;
    const context: LoaderContext = {
      responseType: 'json',
      url: url.href,
    };
    const loadPolicy = config.interstitialAssetListLoadPolicy.default;
    const loaderConfig: LoaderConfiguration = {
      loadPolicy,
      timeout: loadPolicy.maxLoadTimeMs,
      maxRetry: 0,
      retryDelay: 0,
      maxRetryDelay: 0,
    };
    const callbacks: LoaderCallbacks<LoaderContext> = {
      onSuccess: (
        response: LoaderResponse,
        stats: LoaderStats,
        context: LoaderContext,
        networkDetails: any,
      ) => {
        const assetListResponse = response.data as AssetListJSON;
        const assets = assetListResponse?.ASSETS;
        if (!Array.isArray(assets)) {
          const errorData = this.assignAssetListError(
            interstitial,
            ErrorDetails.ASSET_LIST_PARSING_ERROR,
            new Error(`Invalid interstitial asset list`),
            context.url,
            stats,
            networkDetails,
          );
          this.hls.trigger(Events.ERROR, errorData);
          return;
        }
        interstitial.assetListResponse = assetListResponse;
        this.hls.trigger(Events.ASSET_LIST_LOADED, {
          event: interstitial,
          assetListResponse,
          networkDetails,
        });
      },
      onError: (
        error: { code: number; text: string },
        context: LoaderContext,
        networkDetails: any,
        stats: LoaderStats,
      ) => {
        const errorData = this.assignAssetListError(
          interstitial,
          ErrorDetails.ASSET_LIST_LOAD_ERROR,
          new Error(
            `Error loading X-ASSET-LIST: HTTP status ${error.code} ${error.text} (${context.url})`,
          ),
          context.url,
          stats,
          networkDetails,
        );
        this.hls.trigger(Events.ERROR, errorData);
      },
      onTimeout: (
        stats: LoaderStats,
        context: LoaderContext,
        networkDetails: any,
      ) => {
        const errorData = this.assignAssetListError(
          interstitial,
          ErrorDetails.ASSET_LIST_LOAD_TIMEOUT,
          new Error(`Timeout loading X-ASSET-LIST (${context.url})`),
          context.url,
          stats,
          networkDetails,
        );
        this.hls.trigger(Events.ERROR, errorData);
      },
    };
    loader.load(context, loaderConfig, callbacks);
    this.hls.trigger(Events.ASSET_LIST_LOADING, {
      event: interstitial,
    });
    return loader;
  }

  assignAssetListError(
    interstitial: InterstitialEvent,
    details: ErrorDetails,
    error: Error,
    url: string,
    stats?: LoaderStats,
    networkDetails?: any,
  ): ErrorData {
    interstitial.error = error;
    return {
      type: ErrorTypes.NETWORK_ERROR,
      details,
      fatal: false,
      interstitial,
      url,
      error,
      networkDetails,
      stats,
    };
  }
}
