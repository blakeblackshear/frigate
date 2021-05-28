import { h, Component } from 'preact';
import videojs from 'video.js';
import 'videojs-playlist';
import 'video.js/dist/video-js.css';

const defaultOptions = {
  controls: true,
  fluid: true,
};

export default class VideoPlayer extends Component {
  componentDidMount() {
    const { options, onReady = () => {} } = this.props;
    const videoJsOptions = {
      ...defaultOptions,
      ...options,
    };
    const self = this;
    this.player = videojs(this.videoNode, videoJsOptions, function onPlayerReady() {
      onReady(this);
      this.on('error', () => {
        console.error('VIDEOJS: ERROR: currentSources:', this.currentSources());
      });
      this.on('play', () => {
        console.log('VIDEOJS: currentSources:', this.currentSources());
      });
    });
  }

  componentWillUnmount() {
    if (this.player) {
      this.player.dispose();
    }
  }

  shouldComponentUpdate() {
    return false;
  }

  render() {
    const { style } = this.props;
    return (
      <div style={style}>
        <div data-vjs-player>
          <video playsinline ref={(node) => (this.videoNode = node)} className="video-js" />
          <div className="vjs-playlist" />
        </div>
      </div>
    );
  }
}
