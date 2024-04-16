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
  // const foo = config;

  // console.log("config in func", config.cameras);
  // console.log("config as foo in func", foo.cameras);
  // console.log("cameraconfig in func", cameraConfig);
  // console.log("required zones in func", requiredZones);
  // console.log("name", name);
  // console.log("alerts", alertsZones);
  // console.log("detections", detectionsZones);
  // console.log(
  //   "orig detections",
  //   foo?.cameras[camera]?.review.detections.required_zones,
  // );

  const alerts = new Set<string>(alertsZones || []);
  // config?.cameras[camera].review.alerts.required_zones.forEach((zone) => {
  //   alerts.add(zone);
  // });
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
  // config?.cameras[camera].review.detections.required_zones.forEach((zone) => {
  //   detections.add(zone);
  // });

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

  // console.log("dets set", detections);

  // const updatedConfig = updateConfig({
  //   ...config,
  //   cameras: {
  //     ...config.cameras,
  //     [camera]: {
  //       ...config.cameras[camera],
  //       review: {
  //         ...config.cameras[camera].review,
  //         detection: {
  //           ...config.cameras[camera].review.detection,
  //           required_zones: [...detections],
  //         },
  //       },
  //     },
  //   },
  // });

  // console.log(updatedConfig);

  // console.log("alert queries", alertQueries);
  // console.log("detection queries", detectionQueries);

  if (!alertQueries && !same_alerts) {
    // console.log("deleting alerts");
    alertQueries = `&cameras.${camera}.review.alerts`;
  }
  if (!detectionQueries && !same_detections) {
    // console.log("deleting detection");
    detectionQueries = `&cameras.${camera}.review.detections`;
  }

  return { alertQueries, detectionQueries };
};
