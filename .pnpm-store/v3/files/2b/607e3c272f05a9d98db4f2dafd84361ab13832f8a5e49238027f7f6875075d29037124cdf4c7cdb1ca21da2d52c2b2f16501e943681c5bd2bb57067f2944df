/**
 * @author Stephan Hesse <disparat@gmail.com> | <tchakabam@gmail.com>
 *
 * DRM support for Hls.js
 */
import { EventEmitter } from 'eventemitter3';
import { ErrorDetails, ErrorTypes } from '../errors';
import { Events } from '../events';
import { LevelKey } from '../loader/level-key';
import { arrayValuesMatch } from '../utils/arrays';
import {
  addEventListener,
  removeEventListener,
} from '../utils/event-listener-helper';
import { arrayToHex } from '../utils/hex';
import { changeEndianness } from '../utils/keysystem-util';
import { Logger } from '../utils/logger';
import {
  getKeySystemsForConfig,
  getSupportedMediaKeySystemConfigurations,
  isPersistentSessionType,
  keySystemDomainToKeySystemFormat,
  keySystemFormatToKeySystemDomain,
  KeySystems,
  requestMediaKeySystemAccess,
} from '../utils/mediakeys-helper';
import { bin2str, parseSinf } from '../utils/mp4-tools';
import { base64Decode } from '../utils/numeric-encoding-utils';
import { stringify } from '../utils/safe-json-stringify';
import { strToUtf8array } from '../utils/utf8-utils';
import type { EMEControllerConfig, HlsConfig, LoadPolicy } from '../config';
import type Hls from '../hls';
import type { Fragment } from '../loader/fragment';
import type { DecryptData } from '../loader/level-key';
import type { ComponentAPI } from '../types/component-api';
import type {
  ErrorData,
  KeyLoadedData,
  ManifestLoadedData,
  MediaAttachedData,
} from '../types/events';
import type {
  Loader,
  LoaderCallbacks,
  LoaderConfiguration,
  LoaderContext,
} from '../types/loader';
import type { KeySystemFormats } from '../utils/mediakeys-helper';

interface KeySystemAccessPromises {
  keySystemAccess: Promise<MediaKeySystemAccess>;
  mediaKeys?: Promise<MediaKeys>;
  certificate?: Promise<BufferSource | void>;
  hasMediaKeys?: boolean;
}

export interface MediaKeySessionContext {
  keySystem: KeySystems;
  mediaKeys: MediaKeys;
  decryptdata: LevelKey;
  mediaKeysSession: MediaKeySession;
  keyStatus?: MediaKeyStatus;
  keyStatusTimeouts?: { [keyId: string]: number };
  licenseXhr?: XMLHttpRequest;
  _onmessage?: (this: MediaKeySession, ev: MediaKeyMessageEvent) => any;
  _onkeystatuseschange?: (this: MediaKeySession, ev: Event) => any;
}

/**
 * Controller to deal with encrypted media extensions (EME)
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API
 *
 * @class
 * @constructor
 */
class EMEController extends Logger implements ComponentAPI {
  public static CDMCleanupPromise: Promise<void> | void;

  private readonly hls: Hls;
  private readonly config: EMEControllerConfig & {
    loader: { new (confg: HlsConfig): Loader<LoaderContext> };
    certLoadPolicy: LoadPolicy;
    keyLoadPolicy: LoadPolicy;
  };
  private media: HTMLMediaElement | null = null;
  private keyFormatPromise: Promise<KeySystemFormats> | null = null;
  private keySystemAccessPromises: {
    [keysystem: string]: KeySystemAccessPromises | undefined;
  } = {};
  private _requestLicenseFailureCount: number = 0;
  private mediaKeySessions: MediaKeySessionContext[] = [];
  private keyIdToKeySessionPromise: {
    [keyId: string]: Promise<MediaKeySessionContext> | undefined;
  } = {};
  private mediaKeys: MediaKeys | null = null;
  private setMediaKeysQueue: Promise<void>[] = EMEController.CDMCleanupPromise
    ? [EMEController.CDMCleanupPromise]
    : [];
  private bannedKeyIds: { [keyId: string]: MediaKeyStatus | undefined } = {};

  constructor(hls: Hls) {
    super('eme', hls.logger);
    this.hls = hls;
    this.config = hls.config;
    this.registerListeners();
  }

  public destroy() {
    this.onDestroying();
    this.onMediaDetached();
    // Remove any references that could be held in config options or callbacks
    const config = this.config;
    config.requestMediaKeySystemAccessFunc = null;
    config.licenseXhrSetup = config.licenseResponseCallback = undefined;
    config.drmSystems = config.drmSystemOptions = {};
    // @ts-ignore
    this.hls = this.config = this.keyIdToKeySessionPromise = null;
    // @ts-ignore
    this.onMediaEncrypted = this.onWaitingForKey = null;
  }

  private registerListeners() {
    this.hls.on(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    this.hls.on(Events.MEDIA_DETACHED, this.onMediaDetached, this);
    this.hls.on(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    this.hls.on(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    this.hls.on(Events.DESTROYING, this.onDestroying, this);
  }

  private unregisterListeners() {
    this.hls.off(Events.MEDIA_ATTACHED, this.onMediaAttached, this);
    this.hls.off(Events.MEDIA_DETACHED, this.onMediaDetached, this);
    this.hls.off(Events.MANIFEST_LOADING, this.onManifestLoading, this);
    this.hls.off(Events.MANIFEST_LOADED, this.onManifestLoaded, this);
    this.hls.off(Events.DESTROYING, this.onDestroying, this);
  }

  private getLicenseServerUrl(keySystem: KeySystems): string | undefined {
    const { drmSystems, widevineLicenseUrl } = this.config;
    const keySystemConfiguration = drmSystems?.[keySystem];

    if (keySystemConfiguration) {
      return keySystemConfiguration.licenseUrl;
    }

    // For backward compatibility
    if (keySystem === KeySystems.WIDEVINE && widevineLicenseUrl) {
      return widevineLicenseUrl;
    }
  }

  private getLicenseServerUrlOrThrow(keySystem: KeySystems): string | never {
    const url = this.getLicenseServerUrl(keySystem);
    if (url === undefined) {
      throw new Error(
        `no license server URL configured for key-system "${keySystem}"`,
      );
    }
    return url;
  }

  private getServerCertificateUrl(keySystem: KeySystems): string | void {
    const { drmSystems } = this.config;
    const keySystemConfiguration = drmSystems?.[keySystem];

    if (keySystemConfiguration) {
      return keySystemConfiguration.serverCertificateUrl;
    } else {
      this.log(`No Server Certificate in config.drmSystems["${keySystem}"]`);
    }
  }

  private attemptKeySystemAccess(
    keySystemsToAttempt: KeySystems[],
  ): Promise<{ keySystem: KeySystems; mediaKeys: MediaKeys }> {
    const levels = this.hls.levels;
    const uniqueCodec = (value: string | undefined, i, a): value is string =>
      !!value && a.indexOf(value) === i;
    const audioCodecs = levels
      .map((level) => level.audioCodec)
      .filter(uniqueCodec);
    const videoCodecs = levels
      .map((level) => level.videoCodec)
      .filter(uniqueCodec);
    if (audioCodecs.length + videoCodecs.length === 0) {
      videoCodecs.push('avc1.42e01e');
    }

    return new Promise(
      (
        resolve: (result: {
          keySystem: KeySystems;
          mediaKeys: MediaKeys;
        }) => void,
        reject: (Error) => void,
      ) => {
        const attempt = (keySystems) => {
          const keySystem = keySystems.shift();
          this.getMediaKeysPromise(keySystem, audioCodecs, videoCodecs)
            .then((mediaKeys) => resolve({ keySystem, mediaKeys }))
            .catch((error) => {
              if (keySystems.length) {
                attempt(keySystems);
              } else if (error instanceof EMEKeyError) {
                reject(error);
              } else {
                reject(
                  new EMEKeyError(
                    {
                      type: ErrorTypes.KEY_SYSTEM_ERROR,
                      details: ErrorDetails.KEY_SYSTEM_NO_ACCESS,
                      error,
                      fatal: true,
                    },
                    error.message,
                  ),
                );
              }
            });
        };
        attempt(keySystemsToAttempt);
      },
    );
  }

  private requestMediaKeySystemAccess(
    keySystem: KeySystems,
    supportedConfigurations: MediaKeySystemConfiguration[],
  ): Promise<MediaKeySystemAccess> {
    const { requestMediaKeySystemAccessFunc } = this.config;
    if (!(typeof requestMediaKeySystemAccessFunc === 'function')) {
      let errMessage = `Configured requestMediaKeySystemAccess is not a function ${requestMediaKeySystemAccessFunc}`;
      if (
        requestMediaKeySystemAccess === null &&
        self.location.protocol === 'http:'
      ) {
        errMessage = `navigator.requestMediaKeySystemAccess is not available over insecure protocol ${location.protocol}`;
      }
      return Promise.reject(new Error(errMessage));
    }

    return requestMediaKeySystemAccessFunc(keySystem, supportedConfigurations);
  }

  private getMediaKeysPromise(
    keySystem: KeySystems,
    audioCodecs: string[],
    videoCodecs: string[],
  ): Promise<MediaKeys> {
    // This can throw, but is caught in event handler callpath
    const mediaKeySystemConfigs = getSupportedMediaKeySystemConfigurations(
      keySystem,
      audioCodecs,
      videoCodecs,
      this.config.drmSystemOptions || {},
    );
    let keySystemAccessPromises = this.keySystemAccessPromises[keySystem];
    let keySystemAccess = keySystemAccessPromises?.keySystemAccess;
    if (!keySystemAccess) {
      this.log(
        `Requesting encrypted media "${keySystem}" key-system access with config: ${stringify(
          mediaKeySystemConfigs,
        )}`,
      );
      keySystemAccess = this.requestMediaKeySystemAccess(
        keySystem,
        mediaKeySystemConfigs,
      );
      const keySystemAccessPromisesNew = (keySystemAccessPromises =
        this.keySystemAccessPromises[keySystem] =
          {
            keySystemAccess,
          }) as KeySystemAccessPromises;
      keySystemAccess.catch((error) => {
        this.log(
          `Failed to obtain access to key-system "${keySystem}": ${error}`,
        );
      });
      return keySystemAccess.then((mediaKeySystemAccess) => {
        this.log(
          `Access for key-system "${mediaKeySystemAccess.keySystem}" obtained`,
        );

        const certificateRequest = this.fetchServerCertificate(keySystem);

        this.log(`Create media-keys for "${keySystem}"`);
        const mediaKeys = (keySystemAccessPromisesNew.mediaKeys =
          mediaKeySystemAccess.createMediaKeys().then((mediaKeys) => {
            this.log(`Media-keys created for "${keySystem}"`);
            keySystemAccessPromisesNew.hasMediaKeys = true;
            return certificateRequest.then((certificate) => {
              if (certificate) {
                return this.setMediaKeysServerCertificate(
                  mediaKeys,
                  keySystem,
                  certificate,
                );
              }
              return mediaKeys;
            });
          }));

        mediaKeys.catch((error) => {
          this.error(
            `Failed to create media-keys for "${keySystem}"}: ${error}`,
          );
        });

        return mediaKeys;
      });
    }
    return keySystemAccess.then(() => keySystemAccessPromises!.mediaKeys!);
  }

  private createMediaKeySessionContext({
    decryptdata,
    keySystem,
    mediaKeys,
  }: {
    decryptdata: LevelKey;
    keySystem: KeySystems;
    mediaKeys: MediaKeys;
  }): MediaKeySessionContext {
    this.log(
      `Creating key-system session "${keySystem}" keyId: ${arrayToHex(
        decryptdata.keyId || ([] as number[]),
      )} keyUri: ${decryptdata.uri}`,
    );

    const mediaKeysSession = mediaKeys.createSession();

    const mediaKeySessionContext: MediaKeySessionContext = {
      decryptdata,
      keySystem,
      mediaKeys,
      mediaKeysSession,
      keyStatus: 'status-pending',
    };

    this.mediaKeySessions.push(mediaKeySessionContext);

    return mediaKeySessionContext;
  }

  private renewKeySession(mediaKeySessionContext: MediaKeySessionContext) {
    const decryptdata = mediaKeySessionContext.decryptdata;
    if (decryptdata.pssh) {
      const keySessionContext = this.createMediaKeySessionContext(
        mediaKeySessionContext,
      );
      const keyId = getKeyIdString(decryptdata);
      const scheme = 'cenc';
      this.keyIdToKeySessionPromise[keyId] =
        this.generateRequestWithPreferredKeySession(
          keySessionContext,
          scheme,
          decryptdata.pssh.buffer,
          'expired',
        );
    } else {
      this.warn(`Could not renew expired session. Missing pssh initData.`);
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.removeSession(mediaKeySessionContext);
  }

  private updateKeySession(
    mediaKeySessionContext: MediaKeySessionContext,
    data: Uint8Array<ArrayBuffer>,
  ): Promise<void> {
    const keySession = mediaKeySessionContext.mediaKeysSession;
    this.log(
      `Updating key-session "${keySession.sessionId}" for keyId ${arrayToHex(
        mediaKeySessionContext.decryptdata.keyId || [],
      )}
      } (data length: ${data.byteLength})`,
    );
    return keySession.update(data);
  }

  public getSelectedKeySystemFormats(): KeySystemFormats[] {
    return (Object.keys(this.keySystemAccessPromises) as KeySystems[])
      .map((keySystem) => ({
        keySystem,
        hasMediaKeys: this.keySystemAccessPromises[keySystem]!.hasMediaKeys,
      }))
      .filter(({ hasMediaKeys }) => !!hasMediaKeys)
      .map(({ keySystem }) => keySystemDomainToKeySystemFormat(keySystem))
      .filter((keySystem): keySystem is KeySystemFormats => !!keySystem);
  }

  public getKeySystemAccess(keySystemsToAttempt: KeySystems[]): Promise<void> {
    return this.getKeySystemSelectionPromise(keySystemsToAttempt).then(
      ({ keySystem, mediaKeys }) => {
        return this.attemptSetMediaKeys(keySystem, mediaKeys);
      },
    );
  }

  public selectKeySystem(
    keySystemsToAttempt: KeySystems[],
  ): Promise<KeySystemFormats> {
    return new Promise((resolve, reject) => {
      this.getKeySystemSelectionPromise(keySystemsToAttempt)
        .then(({ keySystem }) => {
          const keySystemFormat = keySystemDomainToKeySystemFormat(keySystem);
          if (keySystemFormat) {
            resolve(keySystemFormat);
          } else {
            reject(
              new Error(`Unable to find format for key-system "${keySystem}"`),
            );
          }
        })
        .catch(reject);
    });
  }

  public selectKeySystemFormat(frag: Fragment): Promise<KeySystemFormats> {
    const keyFormats = Object.keys(frag.levelkeys || {}) as KeySystemFormats[];
    if (!this.keyFormatPromise) {
      this.log(
        `Selecting key-system from fragment (sn: ${frag.sn} ${frag.type}: ${
          frag.level
        }) key formats ${keyFormats.join(', ')}`,
      );
      this.keyFormatPromise = this.getKeyFormatPromise(keyFormats);
    }
    return this.keyFormatPromise;
  }

  private getKeyFormatPromise(
    keyFormats: KeySystemFormats[],
  ): Promise<KeySystemFormats> {
    const keySystemsInConfig = getKeySystemsForConfig(this.config);
    const keySystemsToAttempt = keyFormats
      .map(keySystemFormatToKeySystemDomain)
      .filter(
        (value) => !!value && keySystemsInConfig.indexOf(value) !== -1,
      ) as any as KeySystems[];

    return this.selectKeySystem(keySystemsToAttempt);
  }

  public getKeyStatus(decryptdata: LevelKey): MediaKeyStatus | undefined {
    const { mediaKeySessions } = this;
    for (let i = 0; i < mediaKeySessions.length; i++) {
      const status = getKeyStatus(decryptdata, mediaKeySessions[i]);
      if (status) {
        return status;
      }
    }
    return undefined;
  }

  public loadKey(data: KeyLoadedData): Promise<MediaKeySessionContext> {
    const decryptdata = data.keyInfo.decryptdata;

    const keyId = getKeyIdString(decryptdata);
    const badStatus = this.bannedKeyIds[keyId];
    if (badStatus || this.getKeyStatus(decryptdata) === 'internal-error') {
      const error = getKeyStatusError(
        badStatus || 'internal-error',
        decryptdata,
      );
      this.handleError(error, data.frag);
      return Promise.reject(error);
    }
    const keyDetails = `(keyId: ${keyId} format: "${decryptdata.keyFormat}" method: ${decryptdata.method} uri: ${decryptdata.uri})`;

    this.log(`Starting session for key ${keyDetails}`);

    const keyContextPromise = this.keyIdToKeySessionPromise[keyId];
    if (!keyContextPromise) {
      const keySessionContextPromise = this.getKeySystemForKeyPromise(
        decryptdata,
      )
        .then(({ keySystem, mediaKeys }) => {
          this.throwIfDestroyed();
          this.log(
            `Handle encrypted media sn: ${data.frag.sn} ${data.frag.type}: ${data.frag.level} using key ${keyDetails}`,
          );

          return this.attemptSetMediaKeys(keySystem, mediaKeys).then(() => {
            this.throwIfDestroyed();
            return this.createMediaKeySessionContext({
              keySystem,
              mediaKeys,
              decryptdata,
            });
          });
        })
        .then((keySessionContext) => {
          const scheme = 'cenc';
          const initData = decryptdata.pssh ? decryptdata.pssh.buffer : null;
          return this.generateRequestWithPreferredKeySession(
            keySessionContext,
            scheme,
            initData,
            'playlist-key',
          );
        });

      keySessionContextPromise.catch((error) =>
        this.handleError(error, data.frag),
      );
      this.keyIdToKeySessionPromise[keyId] = keySessionContextPromise;

      return keySessionContextPromise;
    }

    // Re-emit error for playlist key loading
    keyContextPromise.catch((error) => {
      if (error instanceof EMEKeyError) {
        const errorData = { ...error.data };
        if (this.getKeyStatus(decryptdata) === 'internal-error') {
          errorData.decryptdata = decryptdata;
        }
        const clonedError = new EMEKeyError(errorData, error.message);
        this.handleError(clonedError, data.frag);
      }
    });

    return keyContextPromise;
  }

  private throwIfDestroyed(message = 'Invalid state'): void | never {
    if (!this.hls as any) {
      throw new Error('invalid state');
    }
  }

  private handleError(error: EMEKeyError | Error, frag?: Fragment) {
    if (!this.hls as any) {
      return;
    }

    if (error instanceof EMEKeyError) {
      if (frag) {
        error.data.frag = frag;
      }
      const levelKey = error.data.decryptdata;
      this.error(
        `${error.message}${
          levelKey ? ` (${arrayToHex(levelKey.keyId || [])})` : ''
        }`,
      );
      this.hls.trigger(Events.ERROR, error.data);
    } else {
      this.error(error.message);
      this.hls.trigger(Events.ERROR, {
        type: ErrorTypes.KEY_SYSTEM_ERROR,
        details: ErrorDetails.KEY_SYSTEM_NO_KEYS,
        error,
        fatal: true,
      });
    }
  }

  private getKeySystemForKeyPromise(
    decryptdata: LevelKey,
  ): Promise<{ keySystem: KeySystems; mediaKeys: MediaKeys }> {
    const keyId = getKeyIdString(decryptdata);
    const mediaKeySessionContext = this.keyIdToKeySessionPromise[keyId];
    if (!mediaKeySessionContext) {
      const keySystem = keySystemFormatToKeySystemDomain(
        decryptdata.keyFormat as KeySystemFormats,
      );
      const keySystemsToAttempt = keySystem
        ? [keySystem]
        : getKeySystemsForConfig(this.config);
      return this.attemptKeySystemAccess(keySystemsToAttempt);
    }
    return mediaKeySessionContext;
  }

  private getKeySystemSelectionPromise(
    keySystemsToAttempt: KeySystems[],
  ): Promise<{ keySystem: KeySystems; mediaKeys: MediaKeys }> | never {
    if (!keySystemsToAttempt.length) {
      keySystemsToAttempt = getKeySystemsForConfig(this.config);
    }
    if (keySystemsToAttempt.length === 0) {
      throw new EMEKeyError(
        {
          type: ErrorTypes.KEY_SYSTEM_ERROR,
          details: ErrorDetails.KEY_SYSTEM_NO_CONFIGURED_LICENSE,
          fatal: true,
        },
        `Missing key-system license configuration options ${stringify({
          drmSystems: this.config.drmSystems,
        })}`,
      );
    }
    return this.attemptKeySystemAccess(keySystemsToAttempt);
  }

  private onMediaEncrypted = (event: MediaEncryptedEvent) => {
    const { initDataType, initData } = event;
    const logMessage = `"${event.type}" event: init data type: "${initDataType}"`;
    this.debug(logMessage);

    // Ignore event when initData is null
    if (initData === null) {
      return;
    }

    if (!this.keyFormatPromise) {
      let keySystems = Object.keys(
        this.keySystemAccessPromises,
      ) as KeySystems[];
      if (!keySystems.length) {
        keySystems = getKeySystemsForConfig(this.config);
      }
      const keyFormats = keySystems
        .map(keySystemDomainToKeySystemFormat)
        .filter((k) => !!k) as KeySystemFormats[];
      this.keyFormatPromise = this.getKeyFormatPromise(keyFormats);
    }

    this.keyFormatPromise
      .then((keySystemFormat) => {
        const keySystem = keySystemFormatToKeySystemDomain(keySystemFormat);
        if (initDataType !== 'sinf' || keySystem !== KeySystems.FAIRPLAY) {
          this.log(
            `Ignoring "${event.type}" event with init data type: "${initDataType}" for selected key-system ${keySystem}`,
          );
          return;
        }

        // Match sinf keyId to playlist skd://keyId=
        let keyId: Uint8Array<ArrayBuffer> | undefined;
        try {
          const json = bin2str(new Uint8Array(initData));
          const sinf = base64Decode(JSON.parse(json).sinf);
          const tenc = parseSinf(sinf);
          if (!tenc) {
            throw new Error(
              `'schm' box missing or not cbcs/cenc with schi > tenc`,
            );
          }
          keyId = new Uint8Array(tenc.subarray(8, 24));
        } catch (error) {
          this.warn(`${logMessage} Failed to parse sinf: ${error}`);
          return;
        }

        const keyIdHex = arrayToHex(keyId);
        const { keyIdToKeySessionPromise, mediaKeySessions } = this;
        let keySessionContextPromise = keyIdToKeySessionPromise[keyIdHex];

        for (let i = 0; i < mediaKeySessions.length; i++) {
          // Match playlist key
          const keyContext = mediaKeySessions[i];
          const decryptdata = keyContext.decryptdata;
          if (!decryptdata.keyId) {
            continue;
          }
          const oldKeyIdHex = arrayToHex(decryptdata.keyId);
          if (
            arrayValuesMatch(keyId, decryptdata.keyId) ||
            decryptdata.uri.replace(/-/g, '').indexOf(keyIdHex) !== -1
          ) {
            keySessionContextPromise = keyIdToKeySessionPromise[oldKeyIdHex];
            if (!keySessionContextPromise) {
              continue;
            }
            if (decryptdata.pssh) {
              break;
            }
            delete keyIdToKeySessionPromise[oldKeyIdHex];
            decryptdata.pssh = new Uint8Array(initData);
            decryptdata.keyId = keyId;
            keySessionContextPromise = keyIdToKeySessionPromise[keyIdHex] =
              keySessionContextPromise.then(() => {
                return this.generateRequestWithPreferredKeySession(
                  keyContext,
                  initDataType,
                  initData,
                  'encrypted-event-key-match',
                );
              });
            keySessionContextPromise.catch((error) => this.handleError(error));
            break;
          }
        }

        if (!keySessionContextPromise) {
          this.handleError(
            new Error(
              `Key ID ${keyIdHex} not encountered in playlist. Key-system sessions ${mediaKeySessions.length}.`,
            ),
          );
        }
      })
      .catch((error) => this.handleError(error));
  };

  private onWaitingForKey = (event: Event) => {
    this.log(`"${event.type}" event`);
  };

  private attemptSetMediaKeys(
    keySystem: KeySystems,
    mediaKeys: MediaKeys,
  ): Promise<void> {
    if (this.mediaKeys === mediaKeys) {
      return Promise.resolve();
    }
    const queue = this.setMediaKeysQueue.slice();

    this.log(`Setting media-keys for "${keySystem}"`);
    // Only one setMediaKeys() can run at one time, and multiple setMediaKeys() operations
    // can be queued for execution for multiple key sessions.
    const setMediaKeysPromise = Promise.all(queue).then(() => {
      if (!this.media) {
        this.mediaKeys = null;
        throw new Error(
          'Attempted to set mediaKeys without media element attached',
        );
      }
      return this.media.setMediaKeys(mediaKeys);
    });
    this.mediaKeys = mediaKeys;
    this.setMediaKeysQueue.push(setMediaKeysPromise);
    return setMediaKeysPromise.then(() => {
      this.log(`Media-keys set for "${keySystem}"`);
      queue.push(setMediaKeysPromise!);
      this.setMediaKeysQueue = this.setMediaKeysQueue.filter(
        (p) => queue.indexOf(p) === -1,
      );
    });
  }

  private generateRequestWithPreferredKeySession(
    context: MediaKeySessionContext,
    initDataType: string,
    initData: ArrayBuffer | null,
    reason:
      | 'playlist-key'
      | 'encrypted-event-key-match'
      | 'encrypted-event-no-match'
      | 'expired',
  ): Promise<MediaKeySessionContext> | never {
    const generateRequestFilter =
      this.config.drmSystems?.[context.keySystem]?.generateRequest;
    if (generateRequestFilter) {
      try {
        const mappedInitData: ReturnType<typeof generateRequestFilter> =
          generateRequestFilter.call(this.hls, initDataType, initData, context);
        if (!mappedInitData) {
          throw new Error(
            'Invalid response from configured generateRequest filter',
          );
        }
        initDataType = mappedInitData.initDataType;
        initData = mappedInitData.initData ? mappedInitData.initData : null;
        context.decryptdata.pssh = initData ? new Uint8Array(initData) : null;
      } catch (error) {
        this.warn(error.message);
        if ((this.hls as any) && this.hls.config.debug) {
          throw error;
        }
      }
    }

    if (initData === null) {
      this.log(`Skipping key-session request for "${reason}" (no initData)`);
      return Promise.resolve(context);
    }

    const keyId = getKeyIdString(context.decryptdata);
    const keyUri = context.decryptdata.uri;
    this.log(
      `Generating key-session request for "${reason}" keyId: ${keyId} URI: ${keyUri} (init data type: ${initDataType} length: ${
        initData.byteLength
      })`,
    );

    const licenseStatus = new EventEmitter();

    const onmessage = (context._onmessage = (event: MediaKeyMessageEvent) => {
      const keySession = context.mediaKeysSession;
      if (!keySession as any) {
        licenseStatus.emit('error', new Error('invalid state'));
        return;
      }
      const { messageType, message } = event;
      this.log(
        `"${messageType}" message event for session "${keySession.sessionId}" message size: ${message.byteLength}`,
      );
      if (
        messageType === 'license-request' ||
        messageType === 'license-renewal'
      ) {
        this.renewLicense(context, message).catch((error) => {
          if (licenseStatus.eventNames().length) {
            licenseStatus.emit('error', error);
          } else {
            this.handleError(error);
          }
        });
      } else if (messageType === 'license-release') {
        if (context.keySystem === KeySystems.FAIRPLAY) {
          this.updateKeySession(context, strToUtf8array('acknowledged'))
            .then(() => this.removeSession(context))
            .catch((error) => this.handleError(error));
        }
      } else {
        this.warn(`unhandled media key message type "${messageType}"`);
      }
    });

    const handleKeyStatus = (
      keyStatus: MediaKeyStatus,
      context: MediaKeySessionContext,
    ) => {
      context.keyStatus = keyStatus;
      let keyError: EMEKeyError | Error | undefined;
      if (keyStatus.startsWith('usable')) {
        licenseStatus.emit('resolved');
      } else if (
        keyStatus === 'internal-error' ||
        keyStatus === 'output-restricted' ||
        keyStatus === 'output-downscaled'
      ) {
        keyError = getKeyStatusError(keyStatus, context.decryptdata);
      } else if (keyStatus === 'expired') {
        keyError = new Error(`key expired (keyId: ${keyId})`);
      } else if (keyStatus === 'released') {
        keyError = new Error(`key released`);
      } else if (keyStatus === 'status-pending') {
        /* no-op */
      } else {
        this.warn(
          `unhandled key status change "${keyStatus}" (keyId: ${keyId})`,
        );
      }
      if (keyError) {
        if (licenseStatus.eventNames().length) {
          licenseStatus.emit('error', keyError);
        } else {
          this.handleError(keyError);
        }
      }
    };
    const onkeystatuseschange = (context._onkeystatuseschange = (
      event: Event,
    ) => {
      const keySession = context.mediaKeysSession;
      if (!keySession as any) {
        licenseStatus.emit('error', new Error('invalid state'));
        return;
      }

      const keyStatuses = this.getKeyStatuses(context);
      const keyIds = Object.keys(keyStatuses);

      // exit if all keys are status-pending
      if (!keyIds.some((id) => keyStatuses[id] !== 'status-pending')) {
        return;
      }

      // renew when a key status for a levelKey comes back expired
      if (keyStatuses[keyId] === 'expired') {
        // renew when a key status comes back expired
        this.log(
          `Expired key ${stringify(keyStatuses)} in key-session "${context.mediaKeysSession.sessionId}"`,
        );
        this.renewKeySession(context);
        return;
      }

      let keyStatus = keyStatuses[keyId] as MediaKeyStatus | undefined;
      if (keyStatus) {
        // handle status of current key
        handleKeyStatus(keyStatus, context);
      } else {
        // Timeout key-status
        const timeout = 1000;
        context.keyStatusTimeouts ||= {};
        context.keyStatusTimeouts[keyId] ||= self.setTimeout(() => {
          if ((!context.mediaKeysSession as any) || !this.mediaKeys) {
            return;
          }

          // Find key status in another session if missing (PlayReady #7519 no key-status "single-key" setup with shared key)
          const sessionKeyStatus = this.getKeyStatus(context.decryptdata);
          if (sessionKeyStatus && sessionKeyStatus !== 'status-pending') {
            this.log(
              `No status for keyId ${keyId} in key-session "${context.mediaKeysSession.sessionId}". Using session key-status ${sessionKeyStatus} from other session.`,
            );
            return handleKeyStatus(sessionKeyStatus, context);
          }

          // Timeout key with internal-error
          this.log(
            `key status for ${keyId} in key-session "${context.mediaKeysSession.sessionId}" timed out after ${timeout}ms`,
          );
          keyStatus = 'internal-error';
          handleKeyStatus(keyStatus, context);
        }, timeout);

        this.log(`No status for keyId ${keyId} (${stringify(keyStatuses)}).`);
      }
    });

    addEventListener(context.mediaKeysSession, 'message', onmessage);
    addEventListener(
      context.mediaKeysSession,
      'keystatuseschange',
      onkeystatuseschange,
    );

    const keyUsablePromise = new Promise(
      (resolve: (value?: void) => void, reject) => {
        licenseStatus.on('error', reject);
        licenseStatus.on('resolved', resolve);
      },
    );

    return context.mediaKeysSession
      .generateRequest(initDataType, initData)
      .then(() => {
        this.log(
          `Request generated for key-session "${context.mediaKeysSession.sessionId}" keyId: ${keyId} URI: ${keyUri}`,
        );
      })
      .catch((error) => {
        throw new EMEKeyError(
          {
            type: ErrorTypes.KEY_SYSTEM_ERROR,
            details: ErrorDetails.KEY_SYSTEM_NO_SESSION,
            error,
            decryptdata: context.decryptdata,
            fatal: false,
          },
          `Error generating key-session request: ${error}`,
        );
      })
      .then(() => keyUsablePromise)
      .catch((error) => {
        licenseStatus.removeAllListeners();
        return this.removeSession(context).then(() => {
          throw error;
        });
      })
      .then(() => {
        licenseStatus.removeAllListeners();
        return context;
      });
  }

  private getKeyStatuses(mediaKeySessionContext: MediaKeySessionContext): {
    [keyId: string]: MediaKeyStatus;
  } {
    const keyStatuses: { [keyId: string]: MediaKeyStatus } = {};
    mediaKeySessionContext.mediaKeysSession.keyStatuses.forEach(
      (status: MediaKeyStatus, keyId: BufferSource) => {
        // keyStatuses.forEach is not standard API so the callback value looks weird on xboxone
        // xboxone callback(keyId, status) so we need to exchange them
        if (typeof keyId === 'string' && typeof status === 'object') {
          const temp = keyId;
          keyId = status;
          status = temp;
        }
        const keyIdArray =
          'buffer' in keyId
            ? new Uint8Array(keyId.buffer, keyId.byteOffset, keyId.byteLength)
            : new Uint8Array(keyId);
        if (
          mediaKeySessionContext.keySystem === KeySystems.PLAYREADY &&
          keyIdArray.length === 16
        ) {
          changeEndianness(keyIdArray);
        }
        const keyIdWithStatusChange = arrayToHex(keyIdArray);
        // Add to banned keys to prevent playlist usage and license requests
        if (status === 'internal-error') {
          this.bannedKeyIds[keyIdWithStatusChange] = status;
        }
        this.log(
          `key status change "${status}" for keyStatuses keyId: ${keyIdWithStatusChange} key-session "${mediaKeySessionContext.mediaKeysSession.sessionId}"`,
        );
        keyStatuses[keyIdWithStatusChange] = status;
      },
    );
    return keyStatuses;
  }

  private fetchServerCertificate(
    keySystem: KeySystems,
  ): Promise<BufferSource | void> {
    const config = this.config;
    const Loader = config.loader;
    const certLoader = new Loader(config as HlsConfig) as Loader<LoaderContext>;
    const url = this.getServerCertificateUrl(keySystem);
    if (!url) {
      return Promise.resolve();
    }
    this.log(`Fetching server certificate for "${keySystem}"`);
    return new Promise((resolve, reject) => {
      const loaderContext: LoaderContext = {
        responseType: 'arraybuffer',
        url,
      };
      const loadPolicy = config.certLoadPolicy.default;
      const loaderConfig: LoaderConfiguration = {
        loadPolicy,
        timeout: loadPolicy.maxLoadTimeMs,
        maxRetry: 0,
        retryDelay: 0,
        maxRetryDelay: 0,
      };
      const loaderCallbacks: LoaderCallbacks<LoaderContext> = {
        onSuccess: (response, stats, context, networkDetails) => {
          resolve(response.data as ArrayBuffer);
        },
        onError: (response, contex, networkDetails, stats) => {
          reject(
            new EMEKeyError(
              {
                type: ErrorTypes.KEY_SYSTEM_ERROR,
                details:
                  ErrorDetails.KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED,
                fatal: true,
                networkDetails,
                response: {
                  url: loaderContext.url,
                  data: undefined,
                  ...response,
                },
              },
              `"${keySystem}" certificate request failed (${url}). Status: ${response.code} (${response.text})`,
            ),
          );
        },
        onTimeout: (stats, context, networkDetails) => {
          reject(
            new EMEKeyError(
              {
                type: ErrorTypes.KEY_SYSTEM_ERROR,
                details:
                  ErrorDetails.KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED,
                fatal: true,
                networkDetails,
                response: {
                  url: loaderContext.url,
                  data: undefined,
                },
              },
              `"${keySystem}" certificate request timed out (${url})`,
            ),
          );
        },
        onAbort: (stats, context, networkDetails) => {
          reject(new Error('aborted'));
        },
      };
      certLoader.load(loaderContext, loaderConfig, loaderCallbacks);
    });
  }

  private setMediaKeysServerCertificate(
    mediaKeys: MediaKeys,
    keySystem: KeySystems,
    cert: BufferSource,
  ): Promise<MediaKeys> {
    return new Promise((resolve, reject) => {
      mediaKeys
        .setServerCertificate(cert)
        .then((success) => {
          this.log(
            `setServerCertificate ${
              success ? 'success' : 'not supported by CDM'
            } (${cert.byteLength}) on "${keySystem}"`,
          );
          resolve(mediaKeys);
        })
        .catch((error) => {
          reject(
            new EMEKeyError(
              {
                type: ErrorTypes.KEY_SYSTEM_ERROR,
                details:
                  ErrorDetails.KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED,
                error,
                fatal: true,
              },
              error.message,
            ),
          );
        });
    });
  }

  private renewLicense(
    context: MediaKeySessionContext,
    keyMessage: ArrayBuffer,
  ): Promise<void> {
    return this.requestLicense(context, new Uint8Array(keyMessage)).then(
      (data: ArrayBuffer) => {
        return this.updateKeySession(context, new Uint8Array(data)).catch(
          (error) => {
            throw new EMEKeyError(
              {
                type: ErrorTypes.KEY_SYSTEM_ERROR,
                details: ErrorDetails.KEY_SYSTEM_SESSION_UPDATE_FAILED,
                decryptdata: context.decryptdata,
                error,
                fatal: false,
              },
              error.message,
            );
          },
        );
      },
    );
  }

  private unpackPlayReadyKeyMessage(
    xhr: XMLHttpRequest,
    licenseChallenge: Uint8Array<ArrayBuffer>,
  ): Uint8Array<ArrayBuffer> {
    // On Edge, the raw license message is UTF-16-encoded XML.  We need
    // to unpack the Challenge element (base64-encoded string containing the
    // actual license request) and any HttpHeader elements (sent as request
    // headers).
    // For PlayReady CDMs, we need to dig the Challenge out of the XML.
    const xmlString = String.fromCharCode.apply(
      null,
      new Uint16Array(licenseChallenge.buffer),
    );
    if (!xmlString.includes('PlayReadyKeyMessage')) {
      // This does not appear to be a wrapped message as on Edge.  Some
      // clients do not need this unwrapping, so we will assume this is one of
      // them.  Note that "xml" at this point probably looks like random
      // garbage, since we interpreted UTF-8 as UTF-16.
      xhr.setRequestHeader('Content-Type', 'text/xml; charset=utf-8');
      return licenseChallenge;
    }
    const keyMessageXml = new DOMParser().parseFromString(
      xmlString,
      'application/xml',
    );
    // Set request headers.
    const headers = keyMessageXml.querySelectorAll('HttpHeader');
    if (headers.length > 0) {
      let header: Element;
      for (let i = 0, len = headers.length; i < len; i++) {
        header = headers[i];
        const name = header.querySelector('name')?.textContent;
        const value = header.querySelector('value')?.textContent;
        if (name && value) {
          xhr.setRequestHeader(name, value);
        }
      }
    }
    const challengeElement = keyMessageXml.querySelector('Challenge');
    const challengeText = challengeElement?.textContent;
    if (!challengeText) {
      throw new Error(`Cannot find <Challenge> in key message`);
    }
    return strToUtf8array(atob(challengeText));
  }

  private setupLicenseXHR(
    xhr: XMLHttpRequest,
    url: string,
    keysListItem: MediaKeySessionContext,
    licenseChallenge: Uint8Array<ArrayBuffer>,
  ): Promise<{
    xhr: XMLHttpRequest;
    licenseChallenge: Uint8Array<ArrayBuffer>;
  }> {
    const licenseXhrSetup = this.config.licenseXhrSetup;

    if (!licenseXhrSetup) {
      xhr.open('POST', url, true);

      return Promise.resolve({ xhr, licenseChallenge });
    }

    return Promise.resolve()
      .then(() => {
        if (!keysListItem.decryptdata as any) {
          throw new Error('Key removed');
        }
        return licenseXhrSetup.call(
          this.hls,
          xhr,
          url,
          keysListItem,
          licenseChallenge,
        );
      })
      .catch((error: Error) => {
        if (!keysListItem.decryptdata as any) {
          // Key session removed. Cancel license request.
          throw error;
        }
        // let's try to open before running setup
        xhr.open('POST', url, true);

        return licenseXhrSetup.call(
          this.hls,
          xhr,
          url,
          keysListItem,
          licenseChallenge,
        );
      })
      .then((licenseXhrSetupResult) => {
        // if licenseXhrSetup did not yet call open, let's do it now
        if (!xhr.readyState) {
          xhr.open('POST', url, true);
        }
        const finalLicenseChallenge = licenseXhrSetupResult
          ? licenseXhrSetupResult
          : licenseChallenge;
        return { xhr, licenseChallenge: finalLicenseChallenge };
      });
  }

  private requestLicense(
    keySessionContext: MediaKeySessionContext,
    licenseChallenge: Uint8Array<ArrayBuffer>,
  ): Promise<ArrayBuffer> {
    const keyLoadPolicy = this.config.keyLoadPolicy.default;
    return new Promise((resolve, reject) => {
      const url = this.getLicenseServerUrlOrThrow(keySessionContext.keySystem);
      this.log(`Sending license request to URL: ${url}`);
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'arraybuffer';
      xhr.onreadystatechange = () => {
        if (
          (!this.hls as any) ||
          (!keySessionContext.mediaKeysSession as any)
        ) {
          return reject(new Error('invalid state'));
        }
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            this._requestLicenseFailureCount = 0;
            let data = xhr.response;
            this.log(
              `License received ${
                data instanceof ArrayBuffer ? data.byteLength : data
              }`,
            );
            const licenseResponseCallback = this.config.licenseResponseCallback;
            if (licenseResponseCallback) {
              try {
                data = licenseResponseCallback.call(
                  this.hls,
                  xhr,
                  url,
                  keySessionContext,
                );
              } catch (error) {
                this.error(error);
              }
            }
            resolve(data);
          } else {
            const retryConfig = keyLoadPolicy.errorRetry;
            const maxNumRetry = retryConfig ? retryConfig.maxNumRetry : 0;
            this._requestLicenseFailureCount++;
            if (
              this._requestLicenseFailureCount > maxNumRetry ||
              (xhr.status >= 400 && xhr.status < 500)
            ) {
              reject(
                new EMEKeyError(
                  {
                    type: ErrorTypes.KEY_SYSTEM_ERROR,
                    details: ErrorDetails.KEY_SYSTEM_LICENSE_REQUEST_FAILED,
                    decryptdata: keySessionContext.decryptdata,
                    fatal: true,
                    networkDetails: xhr,
                    response: {
                      url,
                      data: undefined as any,
                      code: xhr.status,
                      text: xhr.statusText,
                    },
                  },
                  `License Request XHR failed (${url}). Status: ${xhr.status} (${xhr.statusText})`,
                ),
              );
            } else {
              const attemptsLeft =
                maxNumRetry - this._requestLicenseFailureCount + 1;
              this.warn(
                `Retrying license request, ${attemptsLeft} attempts left`,
              );
              this.requestLicense(keySessionContext, licenseChallenge).then(
                resolve,
                reject,
              );
            }
          }
        }
      };
      if (
        keySessionContext.licenseXhr &&
        keySessionContext.licenseXhr.readyState !== XMLHttpRequest.DONE
      ) {
        keySessionContext.licenseXhr.abort();
      }
      keySessionContext.licenseXhr = xhr;

      this.setupLicenseXHR(xhr, url, keySessionContext, licenseChallenge)
        .then(({ xhr, licenseChallenge }) => {
          if (keySessionContext.keySystem == KeySystems.PLAYREADY) {
            licenseChallenge = this.unpackPlayReadyKeyMessage(
              xhr,
              licenseChallenge,
            );
          }
          xhr.send(licenseChallenge);
        })
        .catch(reject);
    });
  }

  private onDestroying() {
    this.unregisterListeners();
    this._clear();
  }

  private onMediaAttached(
    event: Events.MEDIA_ATTACHED,
    data: MediaAttachedData,
  ) {
    if (!this.config.emeEnabled) {
      return;
    }

    const media = data.media;

    // keep reference of media
    this.media = media;

    addEventListener(media, 'encrypted', this.onMediaEncrypted);
    addEventListener(media, 'waitingforkey', this.onWaitingForKey);
  }

  private onMediaDetached() {
    const media = this.media;

    if (media) {
      removeEventListener(media, 'encrypted', this.onMediaEncrypted);
      removeEventListener(media, 'waitingforkey', this.onWaitingForKey);
      this.media = null;
      this.mediaKeys = null;
    }
  }

  private _clear() {
    this._requestLicenseFailureCount = 0;
    this.keyIdToKeySessionPromise = {};
    this.bannedKeyIds = {};
    if (!this.mediaKeys && !this.mediaKeySessions.length) {
      return;
    }
    const media = this.media;
    const mediaKeysList = this.mediaKeySessions.slice();
    this.mediaKeySessions = [];
    this.mediaKeys = null;

    LevelKey.clearKeyUriToKeyIdMap();

    // Close all sessions and remove media keys from the video element.
    const keySessionCount = mediaKeysList.length;
    EMEController.CDMCleanupPromise = Promise.all(
      mediaKeysList
        .map((mediaKeySessionContext) =>
          this.removeSession(mediaKeySessionContext),
        )
        .concat(
          (media?.setMediaKeys(null) as Promise<void> | null)?.catch(
            (error) => {
              this.log(`Could not clear media keys: ${error}`);
              if (!this.hls as any) return;
              this.hls.trigger(Events.ERROR, {
                type: ErrorTypes.OTHER_ERROR,
                details: ErrorDetails.KEY_SYSTEM_DESTROY_MEDIA_KEYS_ERROR,
                fatal: false,
                error: new Error(`Could not clear media keys: ${error}`),
              });
            },
          ) || Promise.resolve(),
        ),
    )
      .catch((error) => {
        this.log(`Could not close sessions and clear media keys: ${error}`);
        if (!this.hls as any) return;
        this.hls.trigger(Events.ERROR, {
          type: ErrorTypes.OTHER_ERROR,
          details: ErrorDetails.KEY_SYSTEM_DESTROY_CLOSE_SESSION_ERROR,
          fatal: false,
          error: new Error(
            `Could not close sessions and clear media keys: ${error}`,
          ),
        });
      })

      .then(() => {
        if (keySessionCount) {
          this.log('finished closing key sessions and clearing media keys');
        }
      });
  }

  private onManifestLoading() {
    this.keyFormatPromise = null;
    this.bannedKeyIds = {};
  }

  private onManifestLoaded(
    event: Events.MANIFEST_LOADED,
    { sessionKeys }: ManifestLoadedData,
  ) {
    if (!sessionKeys || !this.config.emeEnabled) {
      return;
    }
    if (!this.keyFormatPromise) {
      const keyFormats: KeySystemFormats[] = sessionKeys.reduce(
        (formats: KeySystemFormats[], sessionKey: LevelKey) => {
          if (
            formats.indexOf(sessionKey.keyFormat as KeySystemFormats) === -1
          ) {
            formats.push(sessionKey.keyFormat as KeySystemFormats);
          }
          return formats;
        },
        [],
      );
      this.log(
        `Selecting key-system from session-keys ${keyFormats.join(', ')}`,
      );
      this.keyFormatPromise = this.getKeyFormatPromise(keyFormats);
    }
  }

  private removeSession(
    mediaKeySessionContext: MediaKeySessionContext,
  ): Promise<void> {
    const { mediaKeysSession, licenseXhr, decryptdata } =
      mediaKeySessionContext;
    if (mediaKeysSession as MediaKeySession | undefined) {
      this.log(
        `Remove licenses and keys and close session "${mediaKeysSession.sessionId}" keyId: ${arrayToHex((decryptdata as LevelKey | undefined)?.keyId || [])}`,
      );
      if (mediaKeySessionContext._onmessage) {
        mediaKeysSession.removeEventListener(
          'message',
          mediaKeySessionContext._onmessage,
        );
        mediaKeySessionContext._onmessage = undefined;
      }
      if (mediaKeySessionContext._onkeystatuseschange) {
        mediaKeysSession.removeEventListener(
          'keystatuseschange',
          mediaKeySessionContext._onkeystatuseschange,
        );
        mediaKeySessionContext._onkeystatuseschange = undefined;
      }

      if (licenseXhr && licenseXhr.readyState !== XMLHttpRequest.DONE) {
        licenseXhr.abort();
      }
      mediaKeySessionContext.mediaKeysSession =
        mediaKeySessionContext.decryptdata =
        mediaKeySessionContext.licenseXhr =
          undefined!;
      const index = this.mediaKeySessions.indexOf(mediaKeySessionContext);
      if (index > -1) {
        this.mediaKeySessions.splice(index, 1);
      }
      const { keyStatusTimeouts } = mediaKeySessionContext;
      if (keyStatusTimeouts) {
        Object.keys(keyStatusTimeouts).forEach((keyId) =>
          self.clearTimeout(keyStatusTimeouts[keyId]),
        );
      }
      const { drmSystemOptions } = this.config;
      const removePromise = isPersistentSessionType(drmSystemOptions)
        ? new Promise((resolve, reject) => {
            self.setTimeout(
              () => reject(new Error(`MediaKeySession.remove() timeout`)),
              8000,
            );
            mediaKeysSession.remove().then(resolve).catch(reject);
          })
        : Promise.resolve();
      return removePromise
        .catch((error) => {
          this.log(`Could not remove session: ${error}`);
          if (!this.hls as any) return;
          this.hls.trigger(Events.ERROR, {
            type: ErrorTypes.OTHER_ERROR,
            details: ErrorDetails.KEY_SYSTEM_DESTROY_REMOVE_SESSION_ERROR,
            fatal: false,
            error: new Error(`Could not remove session: ${error}`),
          });
        })
        .then(() => {
          return mediaKeysSession.close();
        })
        .catch((error) => {
          this.log(`Could not close session: ${error}`);
          if (!this.hls as any) return;
          this.hls.trigger(Events.ERROR, {
            type: ErrorTypes.OTHER_ERROR,
            details: ErrorDetails.KEY_SYSTEM_DESTROY_CLOSE_SESSION_ERROR,
            fatal: false,
            error: new Error(`Could not close session: ${error}`),
          });
        });
    }
    return Promise.resolve();
  }
}

function getKeyIdString(decryptdata: DecryptData | undefined): string | never {
  if (!decryptdata) {
    throw new Error('Could not read keyId of undefined decryptdata');
  }
  if (decryptdata.keyId === null) {
    throw new Error('keyId is null');
  }
  return arrayToHex(decryptdata.keyId);
}

function getKeyStatus(
  decryptdata: LevelKey,
  keyContext: MediaKeySessionContext,
): MediaKeyStatus | undefined {
  if (
    decryptdata.keyId &&
    keyContext.mediaKeysSession.keyStatuses.has(decryptdata.keyId)
  ) {
    return keyContext.mediaKeysSession.keyStatuses.get(decryptdata.keyId);
  }
  if (decryptdata.matches(keyContext.decryptdata)) {
    return keyContext.keyStatus;
  }
  return undefined;
}

export class EMEKeyError extends Error {
  public readonly data: ErrorData;
  constructor(
    data: Omit<ErrorData, 'error'> & { error?: Error },
    message: string,
  ) {
    super(message);
    data.error ||= new Error(message);
    this.data = data as ErrorData;
    data.err = data.error;
  }
}

function getKeyStatusError(
  keyStatus: MediaKeyStatus,
  decryptdata: LevelKey,
): EMEKeyError {
  const outputRestricted = keyStatus === 'output-restricted';
  const details = outputRestricted
    ? ErrorDetails.KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED
    : ErrorDetails.KEY_SYSTEM_STATUS_INTERNAL_ERROR;
  return new EMEKeyError(
    {
      type: ErrorTypes.KEY_SYSTEM_ERROR,
      details,
      fatal: false,
      decryptdata,
    },
    outputRestricted
      ? 'HDCP level output restricted'
      : `key status changed to "${keyStatus}"`,
  );
}

export default EMEController;
