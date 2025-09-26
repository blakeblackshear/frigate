export enum ErrorTypes {
  // Identifier for a network error (loading error / timeout ...)
  NETWORK_ERROR = 'networkError',
  // Identifier for a media Error (video/parsing/mediasource error)
  MEDIA_ERROR = 'mediaError',
  // EME (encrypted media extensions) errors
  KEY_SYSTEM_ERROR = 'keySystemError',
  // Identifier for a mux Error (demuxing/remuxing)
  MUX_ERROR = 'muxError',
  // Identifier for all other errors
  OTHER_ERROR = 'otherError',
}

export enum ErrorDetails {
  KEY_SYSTEM_NO_KEYS = 'keySystemNoKeys',
  KEY_SYSTEM_NO_ACCESS = 'keySystemNoAccess',
  KEY_SYSTEM_NO_SESSION = 'keySystemNoSession',
  KEY_SYSTEM_NO_CONFIGURED_LICENSE = 'keySystemNoConfiguredLicense',
  KEY_SYSTEM_LICENSE_REQUEST_FAILED = 'keySystemLicenseRequestFailed',
  KEY_SYSTEM_SERVER_CERTIFICATE_REQUEST_FAILED = 'keySystemServerCertificateRequestFailed',
  KEY_SYSTEM_SERVER_CERTIFICATE_UPDATE_FAILED = 'keySystemServerCertificateUpdateFailed',
  KEY_SYSTEM_SESSION_UPDATE_FAILED = 'keySystemSessionUpdateFailed',
  KEY_SYSTEM_STATUS_OUTPUT_RESTRICTED = 'keySystemStatusOutputRestricted',
  KEY_SYSTEM_STATUS_INTERNAL_ERROR = 'keySystemStatusInternalError',
  KEY_SYSTEM_DESTROY_MEDIA_KEYS_ERROR = 'keySystemDestroyMediaKeysError',
  KEY_SYSTEM_DESTROY_CLOSE_SESSION_ERROR = 'keySystemDestroyCloseSessionError',
  KEY_SYSTEM_DESTROY_REMOVE_SESSION_ERROR = 'keySystemDestroyRemoveSessionError',
  // Identifier for a manifest load error - data: { url : faulty URL, response : { code: error code, text: error text }}
  MANIFEST_LOAD_ERROR = 'manifestLoadError',
  // Identifier for a manifest load timeout - data: { url : faulty URL, response : { code: error code, text: error text }}
  MANIFEST_LOAD_TIMEOUT = 'manifestLoadTimeOut',
  // Identifier for a manifest parsing error - data: { url : faulty URL, reason : error reason}
  MANIFEST_PARSING_ERROR = 'manifestParsingError',
  // Identifier for a manifest with only incompatible codecs error - data: { url : faulty URL, reason : error reason}
  MANIFEST_INCOMPATIBLE_CODECS_ERROR = 'manifestIncompatibleCodecsError',
  // Identifier for a level which contains no fragments - data: { url: faulty URL, reason: "no fragments found in level", level: index of the bad level }
  LEVEL_EMPTY_ERROR = 'levelEmptyError',
  // Identifier for a level load error - data: { url : faulty URL, response : { code: error code, text: error text }}
  LEVEL_LOAD_ERROR = 'levelLoadError',
  // Identifier for a level load timeout - data: { url : faulty URL, response : { code: error code, text: error text }}
  LEVEL_LOAD_TIMEOUT = 'levelLoadTimeOut',
  // Identifier for a level parse error - data: { url : faulty URL, error: Error, reason: error message }
  LEVEL_PARSING_ERROR = 'levelParsingError',
  // Identifier for a level switch error - data: { level : faulty level Id, event : error description}
  LEVEL_SWITCH_ERROR = 'levelSwitchError',
  // Identifier for an audio track load error - data: { url : faulty URL, response : { code: error code, text: error text }}
  AUDIO_TRACK_LOAD_ERROR = 'audioTrackLoadError',
  // Identifier for an audio track load timeout - data: { url : faulty URL, response : { code: error code, text: error text }}
  AUDIO_TRACK_LOAD_TIMEOUT = 'audioTrackLoadTimeOut',
  // Identifier for a subtitle track load error - data: { url : faulty URL, response : { code: error code, text: error text }}
  SUBTITLE_LOAD_ERROR = 'subtitleTrackLoadError',
  // Identifier for a subtitle track load timeout - data: { url : faulty URL, response : { code: error code, text: error text }}
  SUBTITLE_TRACK_LOAD_TIMEOUT = 'subtitleTrackLoadTimeOut',
  // Identifier for fragment load error - data: { frag : fragment object, response : { code: error code, text: error text }}
  FRAG_LOAD_ERROR = 'fragLoadError',
  // Identifier for fragment load timeout error - data: { frag : fragment object}
  FRAG_LOAD_TIMEOUT = 'fragLoadTimeOut',
  // Identifier for a fragment decryption error event - data: {id : demuxer Id,frag: fragment object, reason : parsing error description }
  FRAG_DECRYPT_ERROR = 'fragDecryptError',
  // Identifier for a fragment parsing error event - data: { id : demuxer Id, reason : parsing error description }
  // will be renamed DEMUX_PARSING_ERROR and switched to MUX_ERROR in the next major release
  FRAG_PARSING_ERROR = 'fragParsingError',
  // Identifier for a fragment or part load skipped because of a GAP tag or attribute
  FRAG_GAP = 'fragGap',
  // Identifier for a remux alloc error event - data: { id : demuxer Id, frag : fragment object, bytes : nb of bytes on which allocation failed , reason : error text }
  REMUX_ALLOC_ERROR = 'remuxAllocError',
  // Identifier for decrypt key load error - data: { frag : fragment object, response : { code: error code, text: error text }}
  KEY_LOAD_ERROR = 'keyLoadError',
  // Identifier for decrypt key load timeout error - data: { frag : fragment object}
  KEY_LOAD_TIMEOUT = 'keyLoadTimeOut',
  // Triggered when an exception occurs while adding a sourceBuffer to MediaSource - data : { error : exception , mimeType : mimeType }
  BUFFER_ADD_CODEC_ERROR = 'bufferAddCodecError',
  // Triggered when source buffer(s) could not be created using level (manifest CODECS attribute), parsed media, or best guess codec(s) - data: { reason : error reason }
  BUFFER_INCOMPATIBLE_CODECS_ERROR = 'bufferIncompatibleCodecsError',
  // Identifier for a buffer append error - data: append error description
  BUFFER_APPEND_ERROR = 'bufferAppendError',
  // Identifier for a buffer appending error event - data: appending error description
  BUFFER_APPENDING_ERROR = 'bufferAppendingError',
  // Identifier for a buffer stalled error event
  BUFFER_STALLED_ERROR = 'bufferStalledError',
  // Identifier for a buffer full event
  BUFFER_FULL_ERROR = 'bufferFullError',
  // Identifier for a buffer seek over hole event
  BUFFER_SEEK_OVER_HOLE = 'bufferSeekOverHole',
  // Identifier for a buffer nudge on stall (playback is stuck although currentTime is in a buffered area)
  BUFFER_NUDGE_ON_STALL = 'bufferNudgeOnStall',
  // Identifier for a Interstitial Asset List load error - data: { url: faulty URL, response: { code: error code, text: error text } }
  ASSET_LIST_LOAD_ERROR = 'assetListLoadError',
  // Identifier for a Interstitial Asset List load timeout - data: { url: faulty URL, response: { code: error code, text: error text } }
  ASSET_LIST_LOAD_TIMEOUT = 'assetListLoadTimeout',
  // Identifier for a Interstitial Asset List parsing error - data: { url : faulty URL, reason : error reason, response : { code: error code, text: error text }}
  ASSET_LIST_PARSING_ERROR = 'assetListParsingError',
  // Identifier for a Interstitial Asset List parsing error - data: { url : faulty URL, reason : error reason, response : { code: error code, text: error text }}
  INTERSTITIAL_ASSET_ITEM_ERROR = 'interstitialAssetItemError',
  // Identifier for an internal exception happening inside hls.js while handling an event
  INTERNAL_EXCEPTION = 'internalException',
  // Identifier for an internal call to abort a loader
  INTERNAL_ABORTED = 'aborted',
  // Triggered when attachMedia fails
  ATTACH_MEDIA_ERROR = 'attachMediaError',
  // Uncategorized error
  UNKNOWN = 'unknown',
}
