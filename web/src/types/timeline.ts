type Timeline = {
    camera: string;
    timestamp: number;
    data: {
      camera: string;
      label: string;
      sub_label: string;
      box?: [number, number, number, number];
      region: [number, number, number, number];
      attribute: string;
      zones: string[];
    };
    class_type:
      | "visible"
      | "gone"
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