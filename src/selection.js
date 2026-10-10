// A Ctrl/Command click toggles membership; an ordinary click replaces it.
export function selectPointIds(current, id, additive = false) {
  const next = additive ? new Set(current) : new Set();
  if (additive && next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function calculationPoints(points, selected, scope) {
  return scope === 'all' ? points : points.filter(point => selected.has(point.id));
}
