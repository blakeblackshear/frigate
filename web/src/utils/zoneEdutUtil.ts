// Build a config/set query fragment that removes `name` from a
// required_zones list on the given camera section (e.g. "snapshots",
// "mqtt", "objects.genai", "onvif.autotracking"), rebuilding the
// remaining entries. When removing the name empties the list, the
// required_zones key itself is deleted so the field reverts to its
// default instead of retaining the now-stale zone name. Returns an empty
// string when `name` is not present so unrelated sections are untouched.
export const removeRequiredZoneQuery = (
  name: string,
  camera: string,
  section: string,
  zones: string[],
) => {
  const remaining = new Set<string>(zones || []);

  if (!remaining.has(name)) {
    return "";
  }

  remaining.delete(name);

  const key = `cameras.${camera}.${section}.required_zones`;

  if (remaining.size === 0) {
    return `&${key}`;
  }

  return [...remaining].map((zone) => `&${key}=${zone}`).join("");
};

export const reviewQueries = (
  name: string,
  review_alerts: boolean,
  review_detections: boolean,
  camera: string,
  alertsZones: string[],
  detectionsZones: string[],
) => {
  let alertQueries = "";
  let detectionQueries = "";
  let same_alerts = false;
  let same_detections = false;

  const alerts = new Set<string>(alertsZones || []);

  if (review_alerts) {
    alerts.add(name);
  } else {
    same_alerts = !alerts.has(name);
    alerts.delete(name);
  }

  alertQueries = [...alerts]
    .map((zone) => `&cameras.${camera}.review.alerts.required_zones=${zone}`)
    .join("");

  const detections = new Set<string>(detectionsZones || []);

  if (review_detections) {
    detections.add(name);
  } else {
    same_detections = !detections.has(name);
    detections.delete(name);
  }

  detectionQueries = [...detections]
    .map(
      (zone) => `&cameras.${camera}.review.detections.required_zones=${zone}`,
    )
    .join("");

  if (!alertQueries && !same_alerts) {
    alertQueries = `&cameras.${camera}.review.alerts`;
  }
  if (!detectionQueries && !same_detections) {
    detectionQueries = `&cameras.${camera}.review.detections`;
  }

  return { alertQueries, detectionQueries };
};
