// group history cards by 60 seconds of activity
const GROUP_SECONDS = 60;

export function getHourlyTimelineData(
  timelinePages: HourlyTimeline[],
  detailLevel: string
): CardsData {
  const cards: CardsData = {};
  timelinePages.forEach((hourlyTimeline) => {
    Object.keys(hourlyTimeline["hours"])
      .reverse()
      .forEach((hour) => {
        const day = new Date(parseInt(hour) * 1000);
        day.setHours(0, 0, 0, 0);
        const dayKey = (day.getTime() / 1000).toString();

        // build a map of course to the types that are included in this hour
        // which allows us to know what items to keep depending on detail level
        const source_to_types: { [key: string]: string[] } = {};
        let cardTypeStart: { [camera: string]: number } = {};
        Object.values(hourlyTimeline["hours"][hour]).forEach((i) => {
          if (i.timestamp > (cardTypeStart[i.camera] ?? 0) + GROUP_SECONDS) {
            cardTypeStart[i.camera] = i.timestamp;
          }

          const groupKey = `${i.source_id}-${cardTypeStart[i.camera]}`;

          if (groupKey in source_to_types) {
            source_to_types[groupKey].push(i.class_type);
          } else {
            source_to_types[groupKey] = [i.class_type];
          }
        });

        if (!(dayKey in cards)) {
          cards[dayKey] = {};
        }

        if (!(hour in cards[dayKey])) {
          cards[dayKey][hour] = {};
        }

        let cardStart: { [camera: string]: number } = {};
        Object.values(hourlyTimeline["hours"][hour]).forEach((i) => {
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
          if (detailLevel == "normal") {
            if (
              source_to_types[sourceKey].length > 1 &&
              ["active", "attribute", "gone", "stationary", "visible"].includes(
                i.class_type
              )
            ) {
              add = false;
            }
          } else if (detailLevel == "extra") {
            if (
              source_to_types[sourceKey].length > 1 &&
              i.class_type in ["attribute", "gone", "visible"]
            ) {
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
  });

  return cards;
}

export function getTimelineHoursForDay(
  camera: string,
  cards: CardsData,
  allPreviews: Preview[],
  timestamp: number
): TimelinePlayback[] {
  const now = new Date();
  const data: TimelinePlayback[] = [];
  const startDay = new Date(timestamp * 1000);
  startDay.setHours(23, 59, 59, 999);
  const dayEnd = startDay.getTime() / 1000;
  startDay.setHours(0, 0, 0, 0);
  let start = startDay.getTime() / 1000;
  let end = 0;

  const relevantPreviews = allPreviews.filter((preview) => {
    return (
      preview.camera == camera &&
      preview.start >= start &&
      Math.floor(preview.end - 1) <= dayEnd
    );
  });

  const dayIdx = Object.keys(cards).find((day) => {
    if (parseInt(day) > start) {
      return false;
    }

    return true;
  });

  if (dayIdx == undefined) {
    return [];
  }

  const day = cards[dayIdx];

  for (let i = 0; i < 24; i++) {
    startDay.setHours(startDay.getHours() + 1);

    if (startDay > now) {
      break;
    }

    end = startDay.getTime() / 1000;
    const hour = Object.values(day).find((cards) => {
      if (
        Object.values(cards)[0].time < start ||
        Object.values(cards)[0].time > end
      ) {
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
    const relevantPreview = relevantPreviews.find(
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

  return data.reverse();
}
