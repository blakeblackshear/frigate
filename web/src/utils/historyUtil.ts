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
        const source_to_types: { [key: string]: string[] } = {};
        Object.values(hourlyTimeline["hours"][hour]).forEach((i) => {
          const time = new Date(i.timestamp * 1000);
          time.setSeconds(0);
          time.setMilliseconds(0);
          const key = `${i.source_id}-${time.getMinutes()}`;
          if (key in source_to_types) {
            source_to_types[key].push(i.class_type);
          } else {
            source_to_types[key] = [i.class_type];
          }
        });

        if (!Object.keys(cards).includes(dayKey)) {
          cards[dayKey] = {};
        }
        cards[dayKey][hour] = {};
        Object.values(hourlyTimeline["hours"][hour]).forEach((i) => {
          const time = new Date(i.timestamp * 1000);
          const minuteKey = `${i.camera}-${time.getMinutes()}`;
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
              source_to_types[`${i.source_id}-${time.getMinutes()}`].length >
                1 &&
              ["active", "attribute", "gone", "stationary", "visible"].includes(
                i.class_type
              )
            ) {
              add = false;
            }
          } else if (detailLevel == "extra") {
            if (
              source_to_types[`${i.source_id}-${time.getMinutes()}`].length >
                1 &&
              i.class_type in ["attribute", "gone", "visible"]
            ) {
              add = false;
            }
          }

          if (add) {
            if (minuteKey in cards[dayKey][hour]) {
              if (
                !cards[dayKey][hour][minuteKey].uniqueKeys.includes(
                  uniqueKey
                ) ||
                detailLevel == "full"
              ) {
                cards[dayKey][hour][minuteKey].entries.push(i);
                cards[dayKey][hour][minuteKey].uniqueKeys.push(uniqueKey);
              }
            } else {
              cards[dayKey][hour][minuteKey] = {
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
