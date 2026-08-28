import type * as maplibregl from 'maplibre-gl';

// ---------------------------------------------------------------------------
// Polyline decoding
// ---------------------------------------------------------------------------

/** Decode a Google-style encoded polyline string (as returned by OSRM). */
export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

// ---------------------------------------------------------------------------
// Road layer detection
// ---------------------------------------------------------------------------

/** Keywords used to recognise road/transport layers in a tile set. */
const ROAD_KEYWORDS = ['road', 'highway', 'transport', 'street', 'bridge', 'tunnel', 'link'];

export function isRoadFeature(f: maplibregl.MapGeoJSONFeature): boolean {
  const isLine =
    f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString';
  if (!isLine) return false;

  const layerId = f.layer.id.toLowerCase();
  const sourceLayer = ((f.layer as any)['source-layer'] || '').toLowerCase();

  return ROAD_KEYWORDS.some(
    (kw) => layerId.includes(kw) || sourceLayer.includes(kw)
  );
}

// ---------------------------------------------------------------------------
// Segment geometry helpers
// ---------------------------------------------------------------------------

/** Squared point-to-segment distance (longitude/latitude units). */
export function distanceToSegment(
  x: number, y: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const C = x2 - x1;
  const D = y2 - y1;
  const lenSq = C * C + D * D;
  const param = lenSq !== 0 ? ((x - x1) * C + (y - y1) * D) / lenSq : -1;

  let xx: number;
  let yy: number;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }

  return Math.hypot(x - xx, y - yy);
}

// ---------------------------------------------------------------------------
// Intersection-aware road slicing
// ---------------------------------------------------------------------------

/**
 * Given a clicked road feature and the click position, return a `LineString`
 * geometry sliced between the nearest detected intersection nodes.
 */
export function getRoadSegmentBetweenIntersections(
  clickedFeature: maplibregl.MapGeoJSONFeature,
  clickLngLat: { lng: number; lat: number },
  otherRoads: maplibregl.MapGeoJSONFeature[]
): GeoJSON.LineString {
  let coords: [number, number][] = clickedFeature.geometry.type === 'MultiLineString'
    ? pickClosestLine(
        (clickedFeature.geometry as GeoJSON.MultiLineString).coordinates as [number, number][][],
        clickLngLat
      )
    : (clickedFeature.geometry as GeoJSON.LineString).coordinates as [number, number][];

  if (!coords || coords.length < 2) {
    return clickedFeature.geometry as GeoJSON.LineString;
  }

  // Find the segment index closest to the click
  let minDist = Infinity;
  let clickSegIdx = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distanceToSegment(
      clickLngLat.lng, clickLngLat.lat,
      coords[i][0], coords[i][1],
      coords[i + 1][0], coords[i + 1][1]
    );
    if (d < minDist) { minDist = d; clickSegIdx = i; }
  }

  // Build flat list of other road coords for intersection detection
  const otherCoordsList: [number, number][][] = otherRoads.map((f) =>
    f.geometry.type === 'MultiLineString'
      ? (f.geometry as GeoJSON.MultiLineString).coordinates.flat() as [number, number][]
      : (f.geometry as GeoJSON.LineString).coordinates as [number, number][]
  );

  const isIntersection = (coord: [number, number]): boolean =>
    otherCoordsList.some((list) =>
      list.some(
        (oc) => Math.abs(oc[0] - coord[0]) < 0.000035 && Math.abs(oc[1] - coord[1]) < 0.000035
      )
    );

  // Collect intersection indices and slice
  const intersectionIndices: number[] = [];
  for (let i = 0; i < coords.length; i++) {
    if (isIntersection(coords[i])) intersectionIndices.push(i);
  }

  let startIndex = 0;
  let endIndex = coords.length - 1;
  for (const idx of intersectionIndices) {
    if (idx <= clickSegIdx) startIndex = Math.max(startIndex, idx);
    if (idx >= clickSegIdx + 1) { endIndex = Math.min(endIndex, idx); break; }
  }

  return { type: 'LineString', coordinates: coords.slice(startIndex, endIndex + 1) };
}

function pickClosestLine(
  lines: [number, number][][],
  point: { lng: number; lat: number }
): [number, number][] {
  let best = lines[0];
  let minD = Infinity;
  for (const line of lines) {
    for (const pt of line) {
      const d = Math.hypot(pt[0] - point.lng, pt[1] - point.lat);
      if (d < minD) { minD = d; best = line; }
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Feature collection builder (road segment + endpoints)
// ---------------------------------------------------------------------------

export function makeSegmentFeatureCollection(
  lineGeom: GeoJSON.LineString
): GeoJSON.FeatureCollection {
  if (!lineGeom.coordinates || lineGeom.coordinates.length < 2) {
    return { type: 'FeatureCollection', features: [] };
  }
  const first = lineGeom.coordinates[0];
  const last = lineGeom.coordinates[lineGeom.coordinates.length - 1];
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { type: 'line' }, geometry: lineGeom },
      { type: 'Feature', properties: { type: 'endpoint' }, geometry: { type: 'Point', coordinates: first } },
      { type: 'Feature', properties: { type: 'endpoint' }, geometry: { type: 'Point', coordinates: last } },
    ],
  };
}
