import { h, Component } from 'preact';
import videojs from 'video.js';
import 'videojs-mobile-ui';
import 'videojs-playlist';
import 'videojs-seek-buttons';
import 'video.js/dist/video-js.css';
import 'videojs-seek-buttons/dist/videojs-seek-buttons.css';

const defaultOptions = {
  controls: true,
  playbackRates: [0.5, 1, 2, 4, 8],
  fluid: true,
};

export default class VideoPlayer extends Component {
  componentDidMount() {
    const { options, onReady = () => {} } = this.props;
    const videoJsOptions = {
      ...defaultOptions,
      ...options,
    };
    this.player = videojs(this.videoNode, videoJsOptions, function onPlayerReady() {
      onReady(this);
    });
    this.player.seekButtons({
      forward: 30,
      back: 10,
    });
    this.player.mobileUi({
      fullscreen: {
        iOS: true,
      },
    });
  }

  componentWillUnmount() {
    const { onDispose = () => {} } = this.props;
    if (this.player) {
      this.player.dispose();
      onDispose();
    }
  }

  // shouldComponentUpdate() {
  //   return false;
  // }

  render() {
    const { style, children } = this.props;
    return (
      <div style={style}>
        <div data-vjs-player>
          <video ref={(node) => (this.videoNode = node)} className="video-js vjs-default-skin" controls playsinline />
          {children}
        </div>
      </div>
    );
  }
}
