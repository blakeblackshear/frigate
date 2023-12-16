import { useEffect, useRef, ReactElement } from "react";
import videojs from "video.js";
import "videojs-playlist";
import "video.js/dist/video-js.css";
import Player from "video.js/dist/types/player";

type VideoPlayerProps = {
  children?: ReactElement | ReactElement[];
  options?: {
    [key: string]: any;
  };
  seekOptions?: {
    forward?: number;
    backward?: number;
  };
  remotePlayback?: boolean;
  onReady?: (player: Player) => void;
  onDispose?: () => void;
};

export default function VideoPlayer({
  children,
  options,
  seekOptions = { forward: 30, backward: 10 },
  remotePlayback = false,
  onReady = (_) => {},
  onDispose = () => {},
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  useEffect(() => {
    const defaultOptions = {
      controls: true,
      controlBar: {
        skipButtons: seekOptions,
      },
      playbackRates: [0.5, 1, 2, 4, 8],
      fluid: true,
    };

    if (!videojs.browser.IS_FIREFOX) {
      defaultOptions.playbackRates.push(16);
    }

    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode.
      const videoElement = document.createElement(
        "video-js"
      ) as HTMLVideoElement;
      videoElement.controls = true;
      videoElement.playsInline = true;
      videoElement.disableRemotePlayback = remotePlayback;
      videoElement.classList.add("small-player");
      videoElement.classList.add("video-js");
      videoElement.classList.add("vjs-default-skin");
      videoRef.current?.appendChild(videoElement);

      const player = (playerRef.current = videojs(
        videoElement,
        { ...defaultOptions, ...options },
        () => {
          onReady && onReady(player);
        }
      ));
    }
  }, [options, videoRef]);

  // Dispose the Video.js player when the functional component unmounts
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
        onDispose();
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} />
      {children}
    </div>
  );
}
