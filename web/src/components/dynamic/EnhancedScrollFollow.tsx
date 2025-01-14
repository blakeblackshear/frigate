import { useRef, useCallback, ReactNode } from "react";
import { ScrollFollow } from "@melloware/react-logviewer";

export type ScrollFollowProps = {
  startFollowing?: boolean;
  render: (renderProps: ScrollFollowRenderProps) => ReactNode;
};

export type ScrollFollowRenderProps = {
  follow: boolean;
  onScroll: (args: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  }) => void;
  startFollowing: () => void;
  stopFollowing: () => void;
};

const SCROLL_BUFFER = 5; // Additional buffer for scroll checks

export default function EnhancedScrollFollow(props: ScrollFollowProps) {
  const followRef = useRef(props.startFollowing || false);

  const wrappedRender = useCallback(
    (renderProps: ScrollFollowRenderProps) => {
      const wrappedOnScroll = (args: {
        scrollTop: number;
        scrollHeight: number;
        clientHeight: number;
      }) => {
        const bottomThreshold =
          args.scrollHeight - args.clientHeight - SCROLL_BUFFER;
        const isNearBottom = args.scrollTop >= bottomThreshold;

        if (isNearBottom && !followRef.current) {
          renderProps.startFollowing();
          followRef.current = true;
        } else if (!isNearBottom && followRef.current) {
          renderProps.stopFollowing();
          followRef.current = false;
        }

        renderProps.onScroll(args);
      };

      const wrappedStartFollowing = () => {
        renderProps.startFollowing();
        followRef.current = true;
      };

      const wrappedStopFollowing = () => {
        renderProps.stopFollowing();
        followRef.current = false;
      };

      return props.render({
        ...renderProps,
        onScroll: wrappedOnScroll,
        startFollowing: wrappedStartFollowing,
        stopFollowing: wrappedStopFollowing,
        follow: followRef.current,
      });
    },
    [props],
  );

  return <ScrollFollow {...props} render={wrappedRender} />;
}
