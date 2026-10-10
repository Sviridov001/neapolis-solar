import { sunVector } from './solar.js';

// A vertical section containing the current ray. A day's rays generally do
// not lie in one plane; the separate daily path is sampled in three dimensions.
export function rayPlaneFrame(direction) {
  const length = Math.hypot(direction.x, direction.z);
  const horizontal = length > 1e-8
    ? [direction.x / length, 0, direction.z / length]
    : [1, 0, 0];
  return { horizontal, normal: [-horizontal[2], 0, horizontal[0]] };
}

export function daylightPath(settings, step = 5) {
  if (!(step > 0 && step <= 60)) throw new Error('Invalid trajectory step');
  const at = minute => ({ minute, ...sunVector(settings.date, minute,
    settings.lat, settings.lon, settings.utc, settings.north) });
  const path = [];
  let previous = at(0);
  if (previous.y >= 0) path.push(previous);
  for (let minute = step; ; minute = Math.min(1440, minute + step)) {
    const current = at(minute);
    if ((previous.y >= 0) !== (current.y >= 0)) {
      let low = previous.minute, high = current.minute;
      for (let i = 0; i < 24; i++) {
        const middle = (low + high) / 2;
        if ((at(middle).y >= 0) === (previous.y >= 0)) low = middle;
        else high = middle;
      }
      path.push(at((low + high) / 2));
    }
    if (current.y >= 0) path.push(current);
    if (minute === 1440) break;
    previous = current;
  }
  return path;
}
