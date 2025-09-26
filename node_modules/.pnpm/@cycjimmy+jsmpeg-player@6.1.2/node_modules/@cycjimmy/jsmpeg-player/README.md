# JSMpeg Player(TS Player)

![][workflows-badge-image]
[![libraries dependency status][libraries-status-image]][libraries-status-url]
[![libraries sourcerank][libraries-sourcerank-image]][libraries-sourcerank-url]
[![Release date][release-date-image]][release-url]
[![rollup][rollup-image]][rollup-url]
[![semantic-release][semantic-image]][semantic-url]
[![npm license][license-image]][download-url]


* **[jsmpeg-player](https://github.com/cycdpo/jsmpeg-player) has been renamed to @cycjimmy/jsmpeg-player for scoped NPM package.**
* JSMpeg player is based on [jsmpeg](https://github.com/phoboslab/jsmpeg).
* The video must be compressed into the TS format of MPEG1 / MP2.
* Apple device automatically plays without sound, you need to guide the user to click on the video in the lower right corner of the video icon to unlock the sound. (no similar problem in non-autoplay mode)
* [Demo][github-pages-url]

## How to use
### Install
[![NPM version][npm-image]][npm-url]
[![NPM bundle size][npm-bundle-size-image]][npm-url]
[![npm download][download-image]][download-url]

```shell
$ npm install @cycjimmy/jsmpeg-player --save
# or
$ yarn add @cycjimmy/jsmpeg-player
```

### Usage
```javascript
import JSMpeg from '@cycjimmy/jsmpeg-player';
# OR
const JSMpeg = require('@cycjimmy/jsmpeg-player');
```

```javascript
new JSMpeg.VideoElement(videoWrapper, videoUrl [, options] [, overlayOptions])
```

* `JSMpeg.VideoElement` config:
  * `videoWrapper`: [String | Element] The wrapper of the video. The height and width of the wrapper are recommended to be initialized.
  * `videoUrl`: [String] A URL to an MPEG .ts file
  * `options`: [Object] support:
    * `canvas`: [String | Element] The HTML canvas element to use for video rendering. If none is given, the renderer will create its own canvas element. Default `''`.
    * `poster`: [String] URL to an image to use as the poster to show before the video plays. (Recommended to set it manually)
    * `autoplay`: [Boolean] Whether to start playing immediately. Default `false`.
    * `autoSetWrapperSize`: [Boolean] Whether to set the wrapper element size automatically when the video loaded. Default `false`.
    * `loop`: [Boolean] Whether to loop the video (static files only). Default `false`.**[overwrite]**
    * `control`: [Boolean] Whether the user can control. Default `true`.
    * `decodeFirstFrame`: [Boolean] Whether to decode and display the first frame of the video. Default `true`.
    * `picMode`: [Boolean] Picture mode (no playButton). Default `false`.
    * `progressive`: [Boolean] whether to load data in chunks (static files only). Default `true`.
    * `chunkSize` [Number] The chunk size in bytes to load at a time. Default `1024*1024` (1mb).
    * `hooks`: [Object<Function>] The hook function
      * `play`: [Function] The hook function when the video play.
      * `pause`: [Function] The hook function when the video pause.
      * `stop`: [Function] The hook function when the video stop.
      * `load`: [Function] The hook function when the video established.
  * `overlayOptions`: [Object] More options can view the [jsmpeg options](https://github.com/phoboslab/jsmpeg#usage)

* `JSMpeg.VideoElement` instance supports the following methods:
  * `play()`: Start playback
  * `pause()`: Pause playback
  * `stop()`: Stop playback and seek to the beginning
  * `destroy()`: Stop playback and empty video wrapper
* `JSMpeg.VideoElement.player` instance API can view the [JSMpeg.Player API](https://github.com/phoboslab/jsmpeg#jsmpegplayer-api)

### Use in browser
[![jsdelivr][jsdelivr-image]][jsdelivr-url]

```html
<div id="videoWrapper"></div>
<script src="jsmpeg-player.umd.min.js"></script>
<script>
  var videoUrl = '../static/media/test_video.ts';
  new JSMpeg.VideoElement('#videoWrapper', videoUrl);
</script>
```

## CDN
To use via a CDN include this in your HTML:
```text
<script src="https://cdn.jsdelivr.net/npm/@cycjimmy/jsmpeg-player@6/dist/jsmpeg-player.umd.min.js"></script>
```

## Encoding Video/Audio for [jsmpeg](https://github.com/phoboslab/jsmpeg) by [ffmpeg](https://ffmpeg.org/). E.g:
```shell
$ ffmpeg -i input.mp4 -f mpegts \
         -codec:v mpeg1video -s 640x360 -b:v 700k -r 25 -bf 0 \
         -codec:a mp2 -ar 44100 -ac 1 -b:a 64k \
         output.ts
```

* options
  * `-s`: video size
  * `-b:v`: video bit rate
  * `-r`: frame rate
  * `-ar`: sampling rate
  * `-ac`: number of audio channels
  * `-b:a`: audio bit rate


<!-- Links: -->
[npm-image]: https://img.shields.io/npm/v/@cycjimmy/jsmpeg-player
[npm-url]: https://npmjs.org/package/@cycjimmy/jsmpeg-player
[npm-bundle-size-image]: https://img.shields.io/bundlephobia/min/@cycjimmy/jsmpeg-player

[download-image]: https://img.shields.io/npm/dt/@cycjimmy/jsmpeg-player
[download-url]: https://npmjs.org/package/@cycjimmy/jsmpeg-player

[jsdelivr-image]: https://img.shields.io/jsdelivr/npm/hy/@cycjimmy/jsmpeg-player
[jsdelivr-url]: https://www.jsdelivr.com/package/npm/@cycjimmy/jsmpeg-player

[workflows-badge-image]: https://github.com/cycjimmy/jsmpeg-player/workflows/Test%20CI/badge.svg

[libraries-status-image]: https://img.shields.io/librariesio/release/npm/@cycjimmy/jsmpeg-player
[libraries-sourcerank-image]: https://img.shields.io/librariesio/sourcerank/npm/@cycjimmy/jsmpeg-player
[libraries-status-url]: https://libraries.io/github/cycjimmy/jsmpeg-player
[libraries-sourcerank-url]: https://libraries.io/npm/@cycjimmy%2Fjsmpeg-player

[release-date-image]: https://img.shields.io/github/release-date/cycjimmy/jsmpeg-player
[release-url]: https://github.com/cycjimmy/jsmpeg-player/releases

[rollup-image]: https://img.shields.io/github/package-json/dependency-version/cycjimmy/jsmpeg-player/dev/rollup
[rollup-url]: https://github.com/rollup/rollup

[semantic-image]: https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-url]: https://github.com/semantic-release/semantic-release

[license-image]: https://img.shields.io/npm/l/@cycjimmy/jsmpeg-player

[github-pages-url]: https://cycjimmy.github.io/jsmpeg-player/
