type CardsData = {
  [day: string]: {
    [hour: string]: {
      [groupKey: string]: Card;
    };
  };
};

type Card = {
  camera: string;
  time: number;
  entries: Timeline[];
  uniqueKeys: string[];
};

type Preview = {
  camera: string;
  src: string;
  type: string;
  start: number;
  end: number;
};

interface HistoryFilter extends FilterType {
  cameras: string[];
  labels: string[];
  before: number | undefined;
  after: number | undefined;
  detailLevel: "normal" | "extra" | "full";
}

type HistoryTimeline = {
  start: number;
  end: number;
  playbackItems: TimelinePlayback[];
};

type TimelinePlayback = {
  camera: string;
  range: { start: number; end: number };
  timelineItems: Timeline[];
  relevantPreview: Preview | undefined;
};
