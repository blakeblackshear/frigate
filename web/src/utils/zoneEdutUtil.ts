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
