import { h, Component } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import videojs from 'video.js';
import 'videojs-playlist';
import 'video.js/dist/video-js.css';

const defaultOptions = {
  controls: true,
  fluid: true,
};

// export default function VideoPlayer({ children, options, onReady = () => {} }) {
//   const playerRef = useRef(null);
//   useEffect(() => {
//     if (playerRef.current) {
//       const player = videojs(playerRef.current, { ...defaultOptions, ...options }, () => {
//         onReady(player);
//       });
//       return () => {
//         player.dispose();
//       };
//     }
//   }, [options, onReady]);

//   return (
//     <div data-vjs-player>
//       <video ref={playerRef} className="video-js vjs-default-skin" controls playsInline />
//       {children}
//     </div>
//   );
// }

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
