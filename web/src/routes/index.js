export async function getCameraMap(url, cb, props) {
  const module = await import('./CameraMap.jsx');
  return module.default;
}

export async function getCamera(url, cb, props) {
  const module = await import('./Camera.jsx');
  return module.default;
}

export async function getCameraV2(url, cb, props) {
  const module = await import('./Camera_V2.jsx');
  return module.default;
}

export async function getEvent(url, cb, props) {
  const module = await import('./Event.jsx');
  return module.default;
}

export async function getBirdseye(url, cb, props) {
  const module = await import('./Birdseye.jsx');
  return module.default;
}

export async function getEvents(url, cb, props) {
  const module = await import('./Events');
  return module.default;
}

export async function getRecording(url, cb, props) {
  const module = await import('./Recording.jsx');
  return module.default;
}

export async function getDebug(url, cb, props) {
  const module = await import('./Debug.jsx');
  return module.default;
}

export async function getStyleGuide(url, cb, props) {
  const module = await import('./StyleGuide.jsx');
  return module.default;
}
