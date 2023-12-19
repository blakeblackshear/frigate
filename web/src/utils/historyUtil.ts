// group history cards by 60 seconds of activity
const GROUP_SECONDS = 60;

export function getHourlyTimelineData(
  timelinePages: HourlyTimeline[],
  detailLevel: string
) {
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
