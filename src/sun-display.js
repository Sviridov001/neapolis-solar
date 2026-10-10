import { sunVector } from './solar.js';

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

// Adjacent daily rays form a fan rooted at the observation point. Add exact
// calculation interval boundaries so highlighting never rounds to display steps.
export function sectorSlices(settings, intervals = null, step = 3) {
  const samples = daylightPath(settings, step);
  const spans = (intervals || []).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a);
  for (const minute of spans.flat()) {
    if (minute < 0 || minute > 1440) continue;
    const v = sunVector(settings.date, minute, settings.lat, settings.lon, settings.utc, settings.north);
    if (v.y >= 0) samples.push({ minute, ...v });
  }
  samples.sort((a, b) => a.minute - b.minute);
  const unique = samples.filter((p, i) => !i || p.minute - samples[i - 1].minute > 1e-6);
  const slices = [];
  for (let i = 1; i < unique.length; i++) {
    const a = unique[i - 1], b = unique[i];
    if (b.minute - a.minute > step + .01) continue; // never cross the night gap
    const middle = (a.minute + b.minute) / 2;
    slices.push({ a, b, sunlit: spans.some(([start, end]) => middle >= start && middle < end) });
  }
  return slices;
}
