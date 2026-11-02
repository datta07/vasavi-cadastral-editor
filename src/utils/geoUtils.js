export const METERS_PER_LAT = 111132.0;
export const METERS_PER_LON = 111132.0 * Math.cos(15.8043 * Math.PI / 180.0);
export const COLONY_CENTER = [15.8045, 80.3292];

export function applyOffsetToCoords(coords, dLat, dLon) {
  if (typeof coords[0] === 'number') {
    return [coords[0] + dLon, coords[1] + dLat];
  }
  return coords.map(sub => applyOffsetToCoords(sub, dLat, dLon));
}

export function calculateDistanceMeters(latlngs, mapInstance) {
  if (!latlngs || latlngs.length < 2 || !mapInstance) return 0;
  const flat = Array.isArray(latlngs[0]) ? latlngs.flat(Infinity) : latlngs;
  let total = 0;
  for (let i = 0; i < flat.length - 1; i++) {
    if (flat[i] && flat[i + 1]) {
      total += mapInstance.distance(flat[i], flat[i + 1]);
    }
  }
  return total;
}
