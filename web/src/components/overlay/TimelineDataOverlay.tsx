import { ObjectLifecycleSequence } from "@/types/timeline";
import { useState } from "react";

type TimelineEventOverlayProps = {
  timeline: ObjectLifecycleSequence;
  cameraConfig: {
    detect: {
      width: number;
      height: number;
    };
  };
};

export default function TimelineEventOverlay({
  timeline,
  cameraConfig,
}: TimelineEventOverlayProps) {
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const getHoverStyle = () => {
    if (!timeline.data.box) {
      return {};
    }

    if (boxLeftEdge < 15) {
      // show object stats on right side
      return {
        left: `${boxLeftEdge + timeline.data.box[2] * 100 + 1}%`,
        top: `${boxTopEdge}%`,
      };
    }

    return {
      right: `${boxRightEdge + timeline.data.box[2] * 100 + 1}%`,
      top: `${boxTopEdge}%`,
    };
  };

  const getObjectArea = () => {
    if (!timeline.data.box) {
      return 0;
    }

    const width = timeline.data.box[2] * cameraConfig.detect.width;
    const height = timeline.data.box[3] * cameraConfig.detect.height;
    return Math.round(width * height);
  };

  const getObjectRatio = () => {
    if (!timeline.data.box) {
      return 0.0;
    }

    const width = timeline.data.box[2] * cameraConfig.detect.width;
    const height = timeline.data.box[3] * cameraConfig.detect.height;
    return Math.round(100 * (width / height)) / 100;
  };

  if (!timeline.data.box) {
    return null;
  }

  const boxLeftEdge = Math.round(timeline.data.box[0] * 100);
  const boxTopEdge = Math.round(timeline.data.box[1] * 100);
  const boxRightEdge = Math.round(
    (1 - timeline.data.box[2] - timeline.data.box[0]) * 100,
  );
  const boxBottomEdge = Math.round(
    (1 - timeline.data.box[3] - timeline.data.box[1]) * 100,
  );

  return (
    <>
      <div
        className="absolute border-4 border-red-600"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onTouchStart={() => setIsHovering(true)}
        onTouchEnd={() => setIsHovering(false)}
        style={{
          left: `${boxLeftEdge}%`,
          top: `${boxTopEdge}%`,
          right: `${boxRightEdge}%`,
          bottom: `${boxBottomEdge}%`,
        }}
      >
        {timeline.class_type == "entered_zone" ? (
          <div className="absolute bottom-0 left-[50%] h-2 w-2 -translate-x-1/2 translate-y-3/4 bg-yellow-500" />
        ) : null}
      </div>
      {isHovering && (
        <div
          className="absolute block bg-white p-4 text-lg text-black dark:bg-slate-800 dark:text-white"
          style={getHoverStyle()}
        >
          <div>{`Area: ${getObjectArea()} px`}</div>
          <div>{`Ratio: ${getObjectRatio()}`}</div>
        </div>
      )}
    </>
  );
}
