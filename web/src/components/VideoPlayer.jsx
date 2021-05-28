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
    this.player = videojs(this.videoNode, videoJsOptions, function onPlayerReady() {
      onReady(this);
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
