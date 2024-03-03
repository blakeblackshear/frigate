import { FrigateConfig } from "@/types/frigateConfig";
import { GraphDataPoint } from "@/types/graph";
import { formatUnixTimestampToDateTime } from "@/utils/dateUtil";
import useSWR from "swr";
import ActivityIndicator from "../indicators/activity-indicator";

type TimelineBarProps = {
  startTime: number;
  graphData:
    | {
        objects: number[];
        motion: GraphDataPoint[];
      }
    | undefined;
  onClick?: () => void;
};
export default function TimelineBar({
  startTime,
  graphData,
  onClick,
}: TimelineBarProps) {
  const { data: config } = useSWR<FrigateConfig>("config");

  if (!config) {
    return <ActivityIndicator />;
  }

  return (
    <div
      className="my-1 p-1 w-full h-18 border rounded cursor-pointer hover:bg-secondary hover:bg-opacity-30"
      onClick={onClick}
    >
      {graphData != undefined && (
        <div className="relative w-full h-8 flex">
          {getHourBlocks().map((idx) => {
            return (
              <div
                key={idx}
                className={`h-2 flex-auto ${
                  (graphData.motion.at(idx)?.y || 0) == 0
                    ? ""
                    : graphData.objects.includes(idx)
                      ? "bg-object"
                      : "bg-motion"
                }`}
              />
            );
          })}
          <div className="absolute left-0 top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:00" : "%I:00%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[8.3%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:05" : "%I:05%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[16.7%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:10" : "%I:10%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[25%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:15" : "%I:15%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[33.3%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:20" : "%I:20%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[41.7%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:25" : "%I:25%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[50%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:30" : "%I:30%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[58.3%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:35" : "%I:35%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[66.7%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:40" : "%I:40%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[75%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:45" : "%I:45%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[83.3%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:50" : "%I:50%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
          <div className="absolute left-[91.7%] top-0 bottom-0 align-bottom border-l border-gray-500">
            <div className="absolute ml-1 bottom-0 text-sm text-gray-500">
              {formatUnixTimestampToDateTime(startTime, {
                strftime_fmt:
                  config?.ui.time_format == "24hour" ? "%H:55" : "%I:55%P",
                time_style: "medium",
                date_style: "medium",
              })}
            </div>
          </div>
        </div>
      )}
      <div className="text-gray-500">
        {formatUnixTimestampToDateTime(startTime, {
          strftime_fmt:
            config.ui.time_format == "24hour" ? "%m/%d %H:%M" : "%m/%d %I:%M%P",
          time_style: "medium",
          date_style: "medium",
        })}
      </div>
    </div>
  );
}

function getHourBlocks() {
  const arr = [];

  for (let x = 0; x <= 59; x++) {
    arr.push(x);
  }

  return arr;
}
