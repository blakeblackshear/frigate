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

type Timeline = {
  camera: string;
  timestamp: number;
  data: {
    [key: string]: any;
  };
  class_type:
    | "visible"
    | "gone"
    | "sub_label"
    | "entered_zone"
    | "attribute"
    | "active"
    | "stationary"
    | "heard"
    | "external";
  source_id: string;
  source: string;
};

type HourlyTimeline = {
  start: number;
  end: number;
  count: number;
  hours: { [key: string]: Timeline[] };
};

interface HistoryFilter extends FilterType {
  cameras: string[];
  labels: string[];
  before: number | undefined;
  after: number | undefined;
  detailLevel: "normal" | "extra" | "full";
}

type TimelinePlayback = {
  camera: string;
  range: { start: number; end: number };
  timelineItems: Timeline[];
  relevantPreview: Preview | undefined;
};
