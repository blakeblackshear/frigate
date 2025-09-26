[![npm](https://img.shields.io/npm/v/hls.js.svg?style=flat)](https://npmjs.org/package/hls.js)
[![npm](https://img.shields.io/npm/v/hls.js/canary.svg?style=flat)](https://www.npmjs.com/package/hls.js/v/canary)
[![](https://data.jsdelivr.com/v1/package/npm/hls.js/badge?style=rounded)](https://www.jsdelivr.com/package/npm/hls.js)
[![Sauce Test Status](https://saucelabs.com/buildstatus/robwalch)](https://app.saucelabs.com/u/robwalch)
[![jsDeliver](https://data.jsdelivr.com/v1/package/npm/hls.js/badge)](https://www.jsdelivr.com/package/npm/hls.js)

[comment]: <> ([![Sauce Test Status]&#40;https://saucelabs.com/browser-matrix/robwalch.svg&#41;]&#40;https://saucelabs.com/u/robwalch&#41;)

# ![HLS.js](https://raw.githubusercontent.com/video-dev/hls.js/master/docs/logo.svg)

HLS.js is a JavaScript library that implements an [HTTP Live Streaming] client.
It relies on [HTML5 video][] and [MediaSource Extensions][] for playback.

It works by transmuxing MPEG-2 Transport Stream and AAC/MP3 streams into ISO BMFF (MP4) fragments.
Transmuxing is performed asynchronously using a [Web Worker] when available in the browser.
HLS.js also supports HLS + fmp4, as announced during [WWDC2016](https://developer.apple.com/videos/play/wwdc2016/504/).

HLS.js works directly on top of a standard HTML`<video>` element.

HLS.js is written in [ECMAScript6] (`*.js`) and [TypeScript] (`*.ts`) (strongly typed superset of ES6), and transpiled in ECMAScript5 using [Babel](https://babeljs.io/) and the [TypeScript compiler].

[Rollup] is used to build the distro bundle and serve the local development environment.

[html5 video]: https://www.html5rocks.com/en/tutorials/video/basics/
[mediasource extensions]: https://w3c.github.io/media-source/
[http live streaming]: https://en.wikipedia.org/wiki/HTTP_Live_Streaming
[web worker]: https://caniuse.com/#search=worker
[ecmascript6]: https://github.com/ericdouglas/ES6-Learning#articles--tutorials
[typescript]: https://www.typescriptlang.org/
[typescript compiler]: https://www.typescriptlang.org/docs/handbook/compiler-options.html
[rollup]: https://rollupjs.org/

## Features

- VOD & Live playlists
  - DVR support on Live playlists
- Fragmented MP4 container
- MPEG-2 TS container
  - ITU-T Rec. H.264 and ISO/IEC 14496-10 Elementary Stream
  - ITU-T Rec. H.265 and ISO/IEC 23008-2 Elementary Stream
  - ISO/IEC 13818-7 ADTS AAC Elementary Stream
  - ISO/IEC 11172-3 / ISO/IEC 13818-3 (MPEG-1/2 Audio Layer III) Elementary Stream
  - ATSC A/52 / AC-3 / Dolby Digital Elementary Stream
  - Packetized metadata (ID3v2.3.0) Elementary Stream
- AAC container (audio only streams)
- MPEG Audio container (MPEG-1/2 Audio Layer III audio only streams)
- Timed Metadata for HTTP Live Streaming (ID3 format carried in MPEG-2 TS, Emsg in CMAF/Fragmented MP4, and DATERANGE playlist tags)
- AES-128 decryption
- "identity" format SAMPLE-AES decryption of MPEG-2 TS segments only
- Encrypted media extensions (EME) support for DRM (digital rights management)
  - FairPlay, PlayReady, Widevine CDMs with fmp4 segments
- Level capping based on HTMLMediaElement resolution, dropped-frames, and HDCP-Level
- CEA-608/708 captions
- WebVTT subtitles
- Alternate Audio Track Rendition (Master Playlist with Alternative Audio) for VoD and Live playlists
- Adaptive streaming
  - Manual & Auto Quality Switching
    - 3 Quality Switching modes are available (controllable through API means)
      - Instant switching (immediate quality switch at current video position)
      - Smooth switching (quality switch for next loaded fragment)
      - Bandwidth conservative switching (quality switch change for next loaded fragment, without flushing the buffer)
    - In Auto-Quality mode, emergency switch down in case bandwidth is suddenly dropping to minimize buffering.
- Accurate Seeking on VoD & Live (not limited to fragment or keyframe boundary)
- Ability to seek in buffer and back buffer without redownloading segments
- Built-in Analytics
  - All internal events can be monitored (Network Events, Video Events)
  - Playback session metrics are also exposed
- Resilience to errors
  - Retry mechanism embedded in the library
  - Recovery actions can be triggered fix fatal media or network errors
- [Redundant/Failover Playlists](https://developer.apple.com/library/ios/documentation/NetworkingInternet/Conceptual/StreamingMediaGuide/UsingHTTPLiveStreaming/UsingHTTPLiveStreaming.html#//apple_ref/doc/uid/TP40008332-CH102-SW22)
- HLS Variable Substitution

### Supported HLS tags

For details on the HLS format and these tags' meanings, see https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis

#### Multivariant Playlist tags

- `#EXT-X-STREAM-INF:<attribute-list>`
  `<URI>`
- `#EXT-X-MEDIA:<attribute-list>`
- `#EXT-X-SESSION-DATA:<attribute-list>`
- `#EXT-X-SESSION-KEY:<attribute-list>` EME Key-System selection and preloading
- `#EXT-X-START:TIME-OFFSET=<n>`
- `#EXT-X-CONTENT-STEERING:<attribute-list>` Content Steering
- `#EXT-X-DEFINE:<attribute-list>` Variable Substitution (`NAME,VALUE,QUERYPARAM` attributes)

#### Media Playlist tags

- `#EXTM3U` (ignored)
- `#EXT-X-INDEPENDENT-SEGMENTS` (ignored)
- `#EXT-X-VERSION=<n>` (value is ignored)
- `#EXTINF:<duration>,[<title>]`
- `#EXT-X-ENDLIST`
- `#EXT-X-MEDIA-SEQUENCE=<n>`
- `#EXT-X-TARGETDURATION=<n>`
- `#EXT-X-DISCONTINUITY`
- `#EXT-X-DISCONTINUITY-SEQUENCE=<n>`
- `#EXT-X-BITRATE`
- `#EXT-X-BYTERANGE=<n>[@<o>]`
- `#EXT-X-MAP:<attribute-list>`
- `#EXT-X-KEY:<attribute-list>` (`KEYFORMAT="identity",METHOD=SAMPLE-AES` is only supports with MPEG-2 TS segments)
- `#EXT-X-PROGRAM-DATE-TIME:<attribute-list>`
- `#EXT-X-START:TIME-OFFSET=<n>`
- `#EXT-X-SERVER-CONTROL:<attribute-list>`
- `#EXT-X-PART-INF:PART-TARGET=<n>`
- `#EXT-X-PART:<attribute-list>`
- `#EXT-X-SKIP:<attribute-list>` Delta Playlists
- `#EXT-X-RENDITION-REPORT:<attribute-list>`
- `#EXT-X-DATERANGE:<attribute-list>` Metadata
  - HLS EXT-X-DATERANGE Schema for Interstitials
- `#EXT-X-DEFINE:<attribute-list>` Variable Import and Substitution (`NAME,VALUE,IMPORT,QUERYPARAM` attributes)
- `#EXT-X-GAP` (Skips loading GAP segments and parts. Skips playback of unbuffered program containing only GAP content and no suitable alternates. See [#2940](https://github.com/video-dev/hls.js/issues/2940))

Parsed but missing feature support:

- `#EXT-X-PRELOAD-HINT:<attribute-list>` (See [#5074](https://github.com/video-dev/hls.js/issues/3988))
  - #5074

### Not Supported

For a complete list of issues, see ["Top priorities" in the Release Planning and Backlog project tab](https://github.com/video-dev/hls.js/projects/6). Codec support is dependent on the runtime environment (for example, not all browsers on the same OS support HEVC).

- `#EXT-X-I-FRAME-STREAM-INF` I-frame Media Playlist files
- `REQ-VIDEO-LAYOUT` is not used in variant filtering or selection
- "identity" format `SAMPLE-AES` method keys with fmp4, aac, mp3, vtt... segments (MPEG-2 TS only)
- MPEG-2 TS segments with FairPlay Streaming, PlayReady, or Widevine encryption
- FairPlay Streaming legacy keys (For com.apple.fps.1_0 use native Safari playback)
- MP3 elementary stream audio in IE and Edge (<=18) on Windows 10 (See [#1641](https://github.com/video-dev/hls.js/issues/1641) and [Microsoft answers forum](https://answers.microsoft.com/en-us/ie/forum/all/ie11-on-windows-10-cannot-play-hls-with-mp3/2da994b5-8dec-4ae9-9201-7d138ede49d9))

### Server-side-rendering (SSR) and `require` from a Node.js runtime

You can safely require this library in Node and **absolutely nothing will happen**. A dummy object is exported so that requiring the library does not throw an error. HLS.js is not instantiable in Node.js. See [#1841](https://github.com/video-dev/hls.js/pull/1841) for more details.

## Getting started with development

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/video-dev/hls.js/tree/master?title=HLS.JS)

First, checkout the repository and install the required dependencies

```sh
git clone https://github.com/video-dev/hls.js.git
cd hls.js
# After cloning or pulling from the repository, make sure all dependencies are up-to-date
npm install ci
# Run dev-server for demo page (recompiles on file-watch, but doesn't write to actual dist fs artifacts)
npm run dev
# After making changes run the sanity-check task to verify all checks before committing changes
npm run sanity-check
```

The dev server will host files on port 8000. Once started, the demo can be found running at http://localhost:8000/demo/.

Before submitting a PR, please see our [contribution guidelines](CONTRIBUTING.md).
Join the discussion on Slack via [video-dev.org](https://video-dev.org) in #hlsjs for updates and questions about development.

### Build tasks

Build all flavors (suitable for prod-mode/CI):

```
npm install ci
npm run build
```

Only debug-mode artifacts:

```
npm run build:debug
```

Build and watch (customized dev setups where you'll want to host through another server - for example in a sub-module/project)

```
npm run build:watch
```

Only specific flavor (known configs are: debug, dist, light, light-dist, demo):

```
npm run build -- --env dist # replace "dist" by other configuration name, see above ^
```

Note: The "demo" config is always built.

**NOTE:** `hls.light.*.js` dist files do not include alternate-audio, subtitles, CMCD, EME (DRM), or Variable Substitution support. In addition, the following types are not available in the light build:

- `AudioStreamController`
- `AudioTrackController`
- `CuesInterface`
- `EMEController`
- `SubtitleStreamController`
- `SubtitleTrackController`
- `TimelineController`
- `CmcdController`

### Linter (ESlint)

Run linter:

```
npm run lint
```

Run linter with auto-fix mode:

```
npm run lint:fix
```

Run linter with errors only (no warnings)

```
npm run lint:quiet
```

### Formatting Code

Run prettier to format code

```
npm run prettier
```

### Type Check

Run type-check to verify TypeScript types

```
npm run type-check
```

### Automated tests (Mocha/Karma)

Run all tests at once:

```
npm test
```

Run unit tests:

```
npm run test:unit
```

Run unit tests in watch mode:

```
npm run test:unit:watch
```

Run functional (integration) tests:

```
npm run test:func
```

## Design

An overview of this project's design, it's modules, events, and error handling can be found [here](/docs/design.md).

## API docs and usage guide

- [API and usage docs, with code examples](./docs/API.md)
- [Auto-Generated API Docs (Latest Release)](https://hlsjs.video-dev.org/api-docs)
- [Auto-Generated API Docs (Development Branch)](https://hlsjs-dev.video-dev.org/api-docs)

_Note you can access the docs for a particular version using "[https://github.com/video-dev/hls.js/tree/deployments](https://github.com/video-dev/hls.js/tree/deployments)"_

## Demo

### Latest Release

[https://hlsjs.video-dev.org/demo](https://hlsjs.video-dev.org/demo)

### Master

[https://hlsjs-dev.video-dev.org/demo](https://hlsjs-dev.video-dev.org/demo)

### Specific Version

Find the commit on [https://github.com/video-dev/hls.js/tree/deployments](https://github.com/video-dev/hls.js/tree/deployments).

[![](https://opensource.saucelabs.com/images/opensauce/powered-by-saucelabs-badge-gray.png?sanitize=true)](https://saucelabs.com)

## Compatibility

HLS.js is only compatible with browsers supporting MediaSource extensions (MSE) API with 'video/MP4' mime-type inputs.

HLS.js is supported on:

- Chrome 39+ for Android
- Chrome 39+ for Desktop
- Firefox 41+ for Android
- Firefox 42+ for Desktop
- Edge for Windows 10+
- Safari 9+ for macOS 10.11+
- Safari for iPadOS 13+
- Safari for iOS 17.1+ since HLS version [1.5.0](https://github.com/video-dev/hls.js/releases/tag/v1.5.0) using Managed Media Source (MMS) [WebKit blog](https://webkit.org/blog/14735/webkit-features-in-safari-17-1/)

A [Promise polyfill](https://github.com/taylorhakes/promise-polyfill) is required in browsers missing native promise support.

**Please note:**

Safari browsers (iOS, iPadOS, and macOS) have built-in HLS support through the plain video "tag" source URL. See the example below (Using HLS.js) to run appropriate feature detection and choose between using HLS.js or natively built-in HLS support.

When a platform has neither MediaSource nor native HLS support, the browser cannot play HLS.

_Keep in mind that if the intention is to support HLS on multiple platforms, beyond those compatible with HLS.js, the HLS streams need to strictly follow the specifications of RFC8216, especially if apps, smart TVs, and set-top boxes are to be supported._

Find a support matrix of the MediaSource API here: https://developer.mozilla.org/en-US/docs/Web/API/MediaSource

## Using HLS.js

### Installation

Prepackaged builds are included [with each release](https://github.com/video-dev/hls.js/releases). Or install the hls.js as a dependency
of your project:

```sh
npm install --save hls.js
```

A canary channel is also available if you prefer to work off the development branch (master):

```
npm install hls.js@canary
```

### Embedding HLS.js

Directly include dist/hls.js or dist/hls.min.js in a script tag on the page. This setup prioritizes HLS.js MSE playback over
native browser support for HLS playback in HTMLMediaElements:

```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
<!-- Or if you want the latest version from the main branch -->
<!-- <script src="https://cdn.jsdelivr.net/npm/hls.js@canary"></script> -->
<video id="video"></video>
<script>
  var video = document.getElementById('video');
  var videoSrc = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
  }
  // HLS.js is not supported on platforms that do not have Media Source
  // Extensions (MSE) enabled.
  //
  // When the browser has built-in HLS support (check using `canPlayType`),
  // we can provide an HLS manifest (i.e. .m3u8 URL) directly to the video
  // element through the `src` property. This is using the built-in support
  // of the plain video element, without using HLS.js.
  else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
  }
</script>
```

#### Alternative setup

To check for native browser support first and then fallback to HLS.js, swap these conditionals. See [this comment](https://github.com/video-dev/hls.js/pull/2954#issuecomment-670021358) to understand some of the tradeoffs.

```html
<script src="https://cdn.jsdelivr.net/npm/hls.js@1"></script>
<!-- Or if you want the latest version from the main branch -->
<!-- <script src="https://cdn.jsdelivr.net/npm/hls.js@canary"></script> -->
<video id="video"></video>
<script>
  var video = document.getElementById('video');
  var videoSrc = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
  //
  // First check for native browser HLS support
  //
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = videoSrc;
    //
    // If no native HLS support, check if HLS.js is supported
    //
  } else if (Hls.isSupported()) {
    var hls = new Hls();
    hls.loadSource(videoSrc);
    hls.attachMedia(video);
  }
</script>
```

#### Ensure correct time in video

HLS transcoding of an original video file often pushes the time of the first frame a bit. If you depend on having an exact match of frame times between original video and HLS stream, you need to account for this:

```javascript
let tOffset = 0;
const getAppendedOffset = (eventName, { frag }) => {
  if (frag.type === 'main' && frag.sn !== 'initSegment' && frag.elementaryStreams.video) {
    const { start, startDTS, startPTS, maxStartPTS, elementaryStreams } = frag;
    tOffset = elementaryStreams.video.startPTS - start;
    hls.off(Hls.Events.BUFFER_APPENDED, getAppendedOffset);
    console.log('video timestamp offset:', tOffset, { start, startDTS, startPTS, maxStartPTS, elementaryStreams });
  }
}
hls.on(Hls.Events.BUFFER_APPENDED, getAppendedOffset);
// and account for this offset, for example like this:
const video = document.querySelector('video');
video.addEventListener('timeupdate', () => setTime(Math.max(0, video.currentTime - tOffset))
const seek = (t) => video.currentTime = t + tOffset;
const getDuration = () => video.duration - tOffset;
```

For more embed and API examples see [docs/API.md](./docs/API.md).

## CORS

All HLS resources must be delivered with [CORS headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) permitting `GET` requests.

## Video Control

Video is controlled through HTML `<video>` element `HTMLVideoElement` methods, events and optional UI controls (`<video controls>`).

## Build a Custom UI

- [Media Chrome](https://github.com/muxinc/media-chrome)

## Player Integration

The following players integrate HLS.js for HLS playback:

- [JW Player](https://www.jwplayer.com)
- [Akamai Adaptive Media Player (AMP)](https://www.akamai.com/us/en/solutions/products/media-delivery/adaptive-media-player.jsp)
- [BridTV Player](https://www.brid.tv)
- [Clappr](https://github.com/clappr/clappr)
- [Flowplayer](https://www.flowplayer.org) through [flowplayer-hlsjs](https://github.com/flowplayer/flowplayer-hlsjs)
- [MediaElement.js](https://www.mediaelementjs.com)
- [KalturaPlayer](https://developer.kaltura.com) through [kaltura-player-js](https://github.com/kaltura/kaltura-player-js#readme)
- [Videojs](https://videojs.com) through [Videojs-hlsjs](https://github.com/benjipott/videojs-hlsjs)
- [Videojs](https://videojs.com) through [videojs-hls.js](https://github.com/streamroot/videojs-hls.js). hls.js is integrated as a SourceHandler -- new feature in Video.js 5.
- [Videojs](https://videojs.com) through [videojs-contrib-hls.js](https://github.com/Peer5/videojs-contrib-hls.js). Production ready plug-in with full fallback compatibility built-in.
- [Fluid Player](https://www.fluidplayer.com)
- [OpenPlayerJS](https://www.openplayerjs.com), as part of the [OpenPlayer project](https://github.com/openplayerjs)
- [CDNBye](https://github.com/cdnbye/hlsjs-p2p-engine), a p2p engine for hls.js powered by WebRTC Datachannel.
- [M3U IPTV](http://m3u-ip.tv/browser/)
- [ArtPlayer](https://artplayer.org/?libs=https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.17/hls.min.js&example=hls)
- [IPTV Player](https://iptvplayer.stream), A free web-based HLS player that lets you play HLS,DASH and MP4 streams

### They use HLS.js in production!

|                                                                                                                                                              |                                                                                                                                                                         |                                                                                                                                                                |                                                                                                                                                                                                                                         |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
|                 [<img src="https://i.cdn.turner.com/adultswim/big/img/global/adultswim.jpg" width="120">](https://www.adultswim.com/streams)                 |                              [<img src="https://avatars3.githubusercontent.com/u/5497190?s=200&v=4" width="120">](https://www.akamai.com)                               |       [<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Canal%2B.svg/2000px-Canal%2B.svg.png" width="120">](https://www.canalplus.fr)       |                                                                 [<img src="https://avatars2.githubusercontent.com/u/115313" width="120">](https://www.dailymotion.com)                                                                  |
|     [<img src="https://user-images.githubusercontent.com/4006693/44003595-baff193c-9e8f-11e8-9848-7bb91563499f.png" width="120">](https://freshlive.tv)      |           [<img src="https://user-images.githubusercontent.com/360826/231535440-7cf075f1-bf38-4640-a0a7-d9ff74a1e396.png" width="120">](https://www.mux.com/)           |                        [<img src="https://avatars1.githubusercontent.com/u/12554082?s=240" width="120">](https://www.foxsports.com.au)                         |                                          [<img src="https://cloud.githubusercontent.com/assets/244265/12556435/dfaceb48-c353-11e5-971b-2c4429725469.png" width="120">](https://www.globo.com)                                           |
|                          [<img src="https://images.gunosy.com/logo/gunosy_icon_company_logo.png" width="120">](https://gunosy.com)                           |      [<img src="https://user-images.githubusercontent.com/1480052/35802840-f8e85b8a-0a71-11e8-8eb2-eee323e3f159.png" width="120">](https://www.gl-systemhaus.de/)       |       [<img src="https://cloud.githubusercontent.com/assets/6525783/20801836/700490de-b7ea-11e6-82bd-e249f91c7bae.jpg" width="120">](https://nettrek.de)       |                                         [<img src="https://cloud.githubusercontent.com/assets/244265/12556385/999aa884-c353-11e5-9102-79df54384498.png" width="120">](https://www.nytimes.com/)                                         |
|    [<img src="https://cloud.githubusercontent.com/assets/1798553/20356424/ba158574-ac24-11e6-95e1-1ae591b11a0a.png" width="120">](https://www.peer5.com/)    |         [<img src="https://cloud.githubusercontent.com/assets/4909096/20925062/e26e6fc8-bbb4-11e6-99a5-d4762274a342.png" width="120">](https://www.qbrick.com)          |          [<img src="https://www.radiantmediaplayer.com/images/radiantmediaplayer-new-logo-640.jpg" width="120">](https://www.radiantmediaplayer.com/)          |                                                             [<img src="https://www.rts.ch/hummingbird-static/images/logos/logo_marts.svg" width="120">](https://www.rts.ch)                                                             |
| [<img src="https://cloud.githubusercontent.com/assets/12702747/19316434/0a3601de-9067-11e6-85e2-936b1cb099a0.png" width="120">](https://www.snapstream.com/) |                    [<img src="https://pamediagroup.com/wp-content/uploads/2019/05/StreamAMG-Logo-RGB.png" width="120">](https://www.streamamg.com/)                     |            [<img src="https://streamsharkio.sa.metacdn.com/wp-content/uploads/2015/10/streamshark-dark.svg" width="120">](https://streamshark.io/)             | [<img src="https://camo.githubusercontent.com/9580f10e9bfa8aa7fba52c5cb447bee0757e33da/68747470733a2f2f7777772e7461626c6f74762e636f6d2f7374617469632f696d616765732f7461626c6f5f6c6f676f2e706e67" width="120">](https://my.tablotv.com/) |
|  [<img src="https://user-images.githubusercontent.com/2803310/34083705-349c8fd0-e375-11e7-92a6-5c38509f4936.png" width="120">](https://www.streamroot.io/)   |           [<img src="https://user-images.githubusercontent.com/360826/231538721-156a865d-a505-45e7-a362-dafbaf2b182f.png" width="120">](https://www.ted.com/)           |              [<img src="https://www.seeklogo.net/wp-content/uploads/2014/12/twitter-logo-vector-download.jpg" width="120">](https://twitter.com/)              |                                                                 [<img src="https://player.clevercast.com/img/clevercast.png" width="120">](https://www.clevercast.com)                                                                  |
|                        [<img src="https://player.mtvnservices.com/edge/hosted/Viacom_logo.svg" width="120">](https://www.viacom.com/)                        |             [<img src="https://user-images.githubusercontent.com/1181974/29248959-efabc440-802d-11e7-8050-7c1f4ca6c607.png" width="120">](https://vk.com/)              |                         [<img src="https://avatars0.githubusercontent.com/u/5090060?s=200&v=4" width="120">](https://www.jwplayer.com)                         |                                          [<img src="https://raw.githubusercontent.com/kaltura/kaltura-player-js/master/docs/images/kaltura-logo.svg" width="120">](https://corp.kaltura.com/)                                           |
|                          [<img src="https://showmax.akamaized.net/e/logo/showmax_black.png" width="120">](https://tech.showmax.com)                          | [<img src="https://static3.1tv.ru/assets/web/logo-ac67852f1625b338f9d1fb96be089d03557d50bfc5790d5f48dc56799f59dec6.svg" width="120" height="120">](https://www.1tv.ru/) |       [<img src="https://user-images.githubusercontent.com/1480052/40482633-c013ebce-5f55-11e8-96d5-b776415de0ce.png" width="120">](https://www.zdf.de)        |                                                                  [<img src="https://cms-static.brid.tv/img/brid-logo-120x120.jpg" width="120">](https://www.brid.tv/)                                                                   |
|                                                            [cdn77](https://streaming.cdn77.com/)                                                             |                                  [<img src="https://avatars0.githubusercontent.com/u/7442371?s=200&v=4" width="120">](https://r7.com/)                                  | [<img src="https://raw.githubusercontent.com/Novage/p2p-media-loader/gh-pages/images/p2pml-logo.png" width="120">](https://github.com/Novage/p2p-media-loader) |                                                              [<img src="https://avatars3.githubusercontent.com/u/45617200?s=400" width="120">](https://kayosports.com.au)                                                               |
|    [<img src="https://avatars1.githubusercontent.com/u/5279615?s=400&u=9771a216836c613f1edf4afe71cfc69d4c5657ed&v=4" width="120">](https://flosports.tv)     |                  [<img src="https://www.logolynx.com/images/logolynx/c6/c67a2cb3ad33a82b5518f8ad8f124703.png" width="120">](https://global.axon.com/)                   |                    [<img src="https://static.rutube.ru/static/img/svg/logo_rutube_black_color_154x25.svg" width="120">](https://rutube.ru/)                    |                                                                                                                                                                                                                                         |

## Chrome/Firefox integration

made by [gramk](https://github.com/gramk/chrome-hls), plays hls from address bar and m3u8 links

- Chrome [native-hls](https://chrome.google.com/webstore/detail/native-hls-playback/emnphkkblegpebimobpbekeedfgemhof)
- Firefox [native-hls](https://addons.mozilla.org/en-US/firefox/addon/native_hls_playback/)

## License

HLS.js is released under [Apache 2.0 License](LICENSE)
