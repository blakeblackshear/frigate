import { endOfHourOrCurrentTime } from "./dateUtil";

// group history cards by 120 seconds of activity
const GROUP_SECONDS = 120;

export function getHourlyTimelineData(
  timelinePages: HourlyTimeline[],
  detailLevel: string
): CardsData {
  const cards: CardsData = {};
  const allHours: { [key: string]: Timeline[] } = {};

  timelinePages.forEach((hourlyTimeline) => {
    Object.entries(hourlyTimeline.hours).forEach(([key, values]) => {
      if (key in allHours) {
        // only occurs when multiple pages contain elements in the same hour
        allHours[key] = allHours[key]
          .concat(values)
          .sort((a, b) => a.timestamp - b.timestamp);
      } else {
        allHours[key] = values;
      }
    });
  });

  Object.keys(allHours)
    .sort((a, b) => a.localeCompare(b))
    .reverse()
    .forEach((hour) => {
      const day = new Date(parseInt(hour) * 1000);
      day.setHours(0, 0, 0, 0);
      const dayKey = (day.getTime() / 1000).toString();

      // build a map of course to the types that are included in this hour
      // which allows us to know what items to keep depending on detail level
      const sourceToTypes: { [key: string]: string[] } = {};
      let cardTypeStart: { [camera: string]: number } = {};
      Object.values(allHours[hour]).forEach((i) => {
        if (i.timestamp > (cardTypeStart[i.camera] ?? 0) + GROUP_SECONDS) {
          cardTypeStart[i.camera] = i.timestamp;
        }

        const groupKey = `${i.source_id}-${cardTypeStart[i.camera]}`;

        if (groupKey in sourceToTypes) {
          sourceToTypes[groupKey].push(i.class_type);
        } else {
          sourceToTypes[groupKey] = [i.class_type];
        }
      });

      if (!(dayKey in cards)) {
        cards[dayKey] = {};
      }

      if (!(hour in cards[dayKey])) {
        cards[dayKey][hour] = {};
      }

      let cardStart: { [camera: string]: number } = {};
      Object.values(allHours[hour]).forEach((i) => {
        if (i.timestamp > (cardStart[i.camera] ?? 0) + GROUP_SECONDS) {
          cardStart[i.camera] = i.timestamp;
        }

        const time = new Date(i.timestamp * 1000);
        const groupKey = `${i.camera}-${cardStart[i.camera]}`;
        const sourceKey = `${i.source_id}-${cardStart[i.camera]}`;
        const uniqueKey = `${i.source_id}-${i.class_type}`;

        // detail level for saving items
        // detail level determines which timeline items for each moment is returned
        // values can be normal, extra, or full
        // normal: return all items except active / attribute / gone / stationary / visible unless that is the only item.
        // extra: return all items except attribute / gone / visible unless that is the only item
        // full: return all items

        let add = true;
        const sourceType = sourceToTypes[sourceKey];
        let hiddenItems: string[] = [];
        if (detailLevel == "normal") {
          hiddenItems = [
            "active",
            "attribute",
            "gone",
            "stationary",
            "visible",
          ];
        } else if (detailLevel == "extra") {
          hiddenItems = ["attribute", "gone", "visible"];
        }

        if (sourceType.length > 1) {
          // we have multiple timeline items for this card

          if (
            sourceType.find((type) => hiddenItems.includes(type) == false) ==
            undefined
          ) {
            // all of the attribute items for this card make it hidden, but we need to show one
            if (sourceType.indexOf(i.class_type) != 0) {
              add = false;
            }
          } else if (hiddenItems.includes(i.class_type)) {
            add = false;
          }
        }

        if (add) {
          if (groupKey in cards[dayKey][hour]) {
            if (
              !cards[dayKey][hour][groupKey].uniqueKeys.includes(uniqueKey) ||
              detailLevel == "full"
            ) {
              cards[dayKey][hour][groupKey].entries.push(i);
              cards[dayKey][hour][groupKey].uniqueKeys.push(uniqueKey);
            }
          } else {
            cards[dayKey][hour][groupKey] = {
              camera: i.camera,
              time: time.getTime() / 1000,
              entries: [i],
              uniqueKeys: [uniqueKey],
            };
          }
        }
      });
    });

  return cards;
}

export function getTimelineHoursForDay(
  camera: string,
  cards: CardsData,
  cameraPreviews: Preview[],
  timestamp: number
): HistoryTimeline {
  const endOfThisHour = new Date();
  endOfThisHour.setHours(endOfThisHour.getHours() + 1, 0, 0, 0);
  const data: TimelinePlayback[] = [];
  const startDay = new Date(timestamp * 1000);
  startDay.setHours(23, 59, 59, 999);
  startDay.setHours(0, 0, 0, 0);
  const startTimestamp = startDay.getTime() / 1000;
  let start = startDay.getTime() / 1000;
  let end = 0;

  const dayIdx = Object.keys(cards).find((day) => {
    if (parseInt(day) < start) {
      return false;
    }

    return true;
  });

  let day: {
    [hour: string]: {
      [groupKey: string]: Card;
    };
  } = {};

  if (dayIdx != undefined) {
    day = cards[dayIdx];
  }

  for (let i = 0; i < 24; i++) {
    startDay.setHours(startDay.getHours() + 1);

    if (startDay > endOfThisHour) {
      break;
    }

    end = endOfHourOrCurrentTime(startDay.getTime() / 1000);
    const hour = Object.values(day).find((cards) => {
      const card = Object.values(cards)[0];
      if (card == undefined || card.time < start || card.time > end) {
        return false;
      }

      return true;
    });
    const timelineItems: Timeline[] = hour
      ? Object.values(hour).flatMap((card) => {
          if (card.camera == camera) {
            return card.entries;
          }

          return [];
        })
      : [];
    const relevantPreview = cameraPreviews.find(
      (preview) =>
        Math.round(preview.start) >= start && Math.floor(preview.end) <= end
    );
    data.push({
      camera,
      range: { start, end },
      timelineItems,
      relevantPreview,
    });
    start = startDay.getTime() / 1000;
  }

  return { start: startTimestamp, end, playbackItems: data.reverse() };
}
