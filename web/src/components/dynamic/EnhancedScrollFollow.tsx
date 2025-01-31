import { useRef, useCallback, useEffect, type ReactNode } from "react";
import { ScrollFollow } from "@melloware/react-logviewer";

export type ScrollFollowProps = {
  startFollowing?: boolean;
  render: (renderProps: ScrollFollowRenderProps) => ReactNode;
  onCustomScroll?: (
    scrollTop: number,
    scrollHeight: number,
    clientHeight: number,
  ) => void;
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
  onCustomScroll?: (
    scrollTop: number,
    scrollHeight: number,
    clientHeight: number,
  ) => void;
};

const SCROLL_BUFFER = 5;

export default function EnhancedScrollFollow(props: ScrollFollowProps) {
  const followRef = useRef(props.startFollowing || false);
  const prevScrollTopRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    prevScrollTopRef.current = undefined;
  }, []);

  const wrappedRender = useCallback(
    (renderProps: ScrollFollowRenderProps) => {
      const wrappedOnScroll = (args: {
        scrollTop: number;
        scrollHeight: number;
        clientHeight: number;
      }) => {
        // Check if scrolling up and immediately stop following
        if (
          prevScrollTopRef.current !== undefined &&
          args.scrollTop < prevScrollTopRef.current
        ) {
          if (followRef.current) {
            renderProps.stopFollowing();
            followRef.current = false;
          }
        }

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

        prevScrollTopRef.current = args.scrollTop;
        renderProps.onScroll(args);
        if (props.onCustomScroll) {
          props.onCustomScroll(
            args.scrollTop,
            args.scrollHeight,
            args.clientHeight,
          );
        }
      };

      return props.render({
        ...renderProps,
        onScroll: wrappedOnScroll,
        follow: followRef.current,
      });
    },
    [props],
  );

  return <ScrollFollow {...props} render={wrappedRender} />;
}
