export async function getCameraMap(_url, _cb, _props) {
  const module = await import('./CameraMap.jsx');
  return module.default;
}

export async function getCamera(_url, _cb, _props) {
  const module = await import('./Camera.jsx');
  return module.default;
}

export async function getCameraV2(_url, _cb, _props) {
  const module = await import('./Camera_V2.jsx');
  return module.default;
}

export async function getBirdseye(_url, _cb, _props) {
  const module = await import('./Birdseye.jsx');
  return module.default;
}

export async function getEvents(_url, _cb, _props) {
  const module = await import('./Events.jsx');
  return module.default;
}

export async function getRecording(_url, _cb, _props) {
  const module = await import('./Recording.jsx');
  return module.default;
}

export async function getSystem(_url, _cb, _props) {
  const module = await import('./System.jsx');
  return module.default;
}

export async function getStorage(_url, _cb, _props) {
  const module = await import('./Storage.jsx');
  return module.default;
}

export async function getConfig(_url, _cb, _props) {
  const module = await import('./Config.jsx');
  return module.default;
}

export async function getLogs(_url, _cb, _props) {
  const module = await import('./Logs.jsx');
  return module.default;
}

export async function getStyleGuide(_url, _cb, _props) {
  const module = await import('./StyleGuide.jsx');
  return module.default;
}
