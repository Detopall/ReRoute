import { useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { decodePolyline } from '../utils/geo';
import type { LatLng, BlacklistItem, RouteInfo, AvoidanceSensitivity } from '../types';

interface UseRouteOptions {
  map: maplibregl.Map | null;
  blacklistItems: BlacklistItem[];
  showToast: (msg: string) => void;
  sensitivity?: AvoidanceSensitivity;
}

interface WaypointPoint {
  lng: number;
  lat: number;
  proj: number;
}

async function fetchOSRM(coordString: string, alternatives: boolean | number = true): Promise<any[]> {
  const altParam = typeof alternatives === 'number' ? alternatives : alternatives ? 'true' : 'false';
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=polyline&steps=false&alternatives=${altParam}`
  );
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  if (!data.routes?.length) throw new Error('No route found');
  return data.routes;
}

function getBufferDistances(sens: AvoidanceSensitivity | 'minimal'): { road: number; area: number } {
  switch (sens) {
    case 'strict':
      return { road: 0.04, area: 0.02 }; // 40m road, 20m area
    case 'balanced':
      return { road: 0.02, area: 0.008 }; // 20m road, 8m area
    case 'relaxed':
      return { road: 0.008, area: 0.003 }; // 8m road, 3m area
    case 'minimal':
      return { road: 0.002, area: 0.001 }; // 2m road, 1m area
  }
}

/**
 * Check whether a route geometry intersects any blacklisted zone.
 * Trims start and end slightly (50m) so starting/ending near a blacklisted item
 * doesn't cause false positives.
 */
function routeIntersectsBlacklist(
  geom: GeoJSON.LineString,
  bufferedBlacklists: Array<{ poly: any }>
): boolean {
  if (bufferedBlacklists.length === 0) return false;

  let testGeom: GeoJSON.LineString = geom;
  try {
    const line = turf.lineString(geom.coordinates);
    const totalLen = turf.length(line, { units: 'kilometers' });
    const trimMeters = 0.05; // 50m trim at start and end
    if (totalLen > trimMeters * 3) {
      const trimmed = turf.lineSliceAlong(line, trimMeters, totalLen - trimMeters, { units: 'kilometers' });
      testGeom = trimmed.geometry as GeoJSON.LineString;
    }
  } catch {
    // Fallback to full geometry if slicing fails
  }

  return bufferedBlacklists.some((b) => {
    try {
      return turf.booleanIntersects(testGeom, b.poly as any);
    } catch {
      return false;
    }
  });
}

export function useRoute({ map, blacklistItems, showToast, sensitivity = 'balanced' }: UseRouteOptions) {
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [allRoutes, setAllRoutes] = useState<RouteInfo[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [calculating, setCalculating] = useState(false);

  const renderRoutesOnMap = useCallback(
    (routes: RouteInfo[], activeIndex: number) => {
      if (!map || !map.isStyleLoaded()) return;

      [0, 1, 2, 3, 4, 5].forEach((idx) => {
        if (map.getLayer(`alt-route-${idx}-line`)) map.removeLayer(`alt-route-${idx}-line`);
        if (map.getLayer(`alt-route-${idx}-outline`)) map.removeLayer(`alt-route-${idx}-outline`);
        if (map.getSource(`alt-route-${idx}`)) map.removeSource(`alt-route-${idx}`);
      });
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getLayer('route-outline')) map.removeLayer('route-outline');
      if (map.getSource('route')) map.removeSource('route');

      routes.forEach((r, idx) => {
        if (idx === activeIndex) return;
        const sourceId = `alt-route-${idx}`;
        const lineLayerId = `alt-route-${idx}-line`;

        map.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: r.geometry } });
        map.addLayer({
          id: `alt-route-${idx}-outline`,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#334155', 'line-width': 8, 'line-opacity': 0.5 },
        });
        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#06b6d4', 'line-width': 5, 'line-opacity': 0.9, 'line-dasharray': [3, 2] },
        });

        map.on('click', lineLayerId, () => {
          setSelectedRouteIndex(idx);
          setRouteInfo(routes[idx]);
          renderRoutesOnMap(routes, idx);
        });
        map.on('mouseenter', lineLayerId, () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', lineLayerId, () => { map.getCanvas().style.cursor = ''; });
      });

      const activeRoute = routes[activeIndex];
      if (activeRoute) {
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: activeRoute.geometry } });
        map.addLayer({
          id: 'route-outline',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#1e1b4b', 'line-width': 11, 'line-opacity': 0.6 },
        });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#6366f1', 'line-width': 6.5, 'line-opacity': 0.95 },
        });

        const allLngs = activeRoute.geometry.coordinates.map((c) => c[0]);
        const allLats = activeRoute.geometry.coordinates.map((c) => c[1]);
        map.fitBounds(
          new maplibregl.LngLatBounds(
            [Math.min(...allLngs), Math.min(...allLats)],
            [Math.max(...allLngs), Math.max(...allLats)]
          ),
          { padding: 80 }
        );
      }
    },
    [map]
  );

  const selectRoute = useCallback(
    (index: number) => {
      if (index >= 0 && index < allRoutes.length) {
        setSelectedRouteIndex(index);
        setRouteInfo(allRoutes[index]);
        renderRoutesOnMap(allRoutes, index);
      }
    },
    [allRoutes, renderRoutesOnMap]
  );

  const calculateRoute = useCallback(
    async (startLocation: LatLng, destLocation: LatLng) => {
      if (!map) return;
      setCalculating(true);

      try {
        const startCoord = `${startLocation.lng.toFixed(6)},${startLocation.lat.toFixed(6)}`;
        const destCoord = `${destLocation.lng.toFixed(6)},${destLocation.lat.toFixed(6)}`;

        // Sensitivity fallback hierarchy: selected -> relaxed -> minimal
        const sensitivityTiers: (AvoidanceSensitivity | 'minimal')[] = [sensitivity];
        if (sensitivity === 'strict') sensitivityTiers.push('balanced', 'relaxed', 'minimal');
        else if (sensitivity === 'balanced') sensitivityTiers.push('relaxed', 'minimal');
        else if (sensitivity === 'relaxed') sensitivityTiers.push('minimal');

        let validCleanRoutes: RouteInfo[] = [];
        let usedTier: AvoidanceSensitivity | 'minimal' = sensitivity;
        let directCandidate: RouteInfo | null = null;

        for (const tier of sensitivityTiers) {
          const { road: roadBuf, area: areaBuf } = getBufferDistances(tier);

          const bufferedBlacklists = blacklistItems.map((item) => {
            try {
              const bufDist = item.type === 'road' ? roadBuf : areaBuf;
              const buffered = turf.buffer(item.geometry as any, bufDist, { units: 'kilometers' });
              let poly: any = item.geometry;
              if (buffered) {
                poly = (buffered as any).type === 'FeatureCollection' ? (buffered as any).features[0] : buffered;
              }
              return { id: item.id, item, poly };
            } catch {
              return { id: item.id, item, poly: item.geometry as any };
            }
          });

          // Step 1: Check direct OSRM routes
          try {
            const directRoutes = await fetchOSRM(`${startCoord};${destCoord}`, 3);
            for (let i = 0; i < directRoutes.length; i++) {
              const coords = decodePolyline(directRoutes[i].geometry);
              const geom: GeoJSON.LineString = { type: 'LineString', coordinates: coords };

              if (!directCandidate && i === 0) {
                directCandidate = {
                  id: `direct-fallback`,
                  distance: directRoutes[i].distance,
                  duration: directRoutes[i].duration,
                  geometry: geom,
                  summary: directRoutes[i].legs?.[0]?.summary || 'Direct Route',
                };
              }

              if (!routeIntersectsBlacklist(geom, bufferedBlacklists)) {
                validCleanRoutes.push({
                  id: `direct-${i}`,
                  distance: directRoutes[i].distance,
                  duration: directRoutes[i].duration,
                  geometry: geom,
                  summary: directRoutes[i].legs?.[0]?.summary || 'Direct Route',
                });
              }
            }
          } catch {}

          if (bufferedBlacklists.length === 0 && validCleanRoutes.length > 0) {
            break;
          }

          // Step 2: Compute detour waypoints using normal vector offsets
          const dx = destLocation.lng - startLocation.lng;
          const dy = destLocation.lat - startLocation.lat;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const nx = -uy;
          const ny = ux;

          const sides: (1 | -1)[] = [1, -1];
          const offsetsDeg = [0.002, 0.005, 0.01, 0.02, 0.04, 0.08, 0.15];

          for (const side of sides) {
            let foundForThisSide = false;
            for (const offsetDeg of offsetsDeg) {
              const waypoints: WaypointPoint[] = [];

              for (const b of bufferedBlacklists) {
                const bbox = turf.bbox(b.poly) as [number, number, number, number];
                const cx = (bbox[0] + bbox[2]) / 2;
                const cy = (bbox[1] + bbox[3]) / 2;

                const bboxCorners: [number, number][] = [
                  [bbox[0], bbox[1]], [bbox[2], bbox[1]],
                  [bbox[2], bbox[3]], [bbox[0], bbox[3]],
                ];

                const normalProjs = bboxCorners.map(([x, y]) => x * nx + y * ny);
                const centroidNormalProj = cx * nx + cy * ny;
                const edgeInNormalDir = side === 1 ? Math.max(...normalProjs) : Math.min(...normalProjs);
                const halfNormalExtent = Math.abs(edgeInNormalDir - centroidNormalProj);
                const normalOffset = side * (halfNormalExtent + offsetDeg);

                const detourLng = cx + normalOffset * nx;
                const detourLat = cy + normalOffset * ny;
                const proj = (detourLng - startLocation.lng) * dx + (detourLat - startLocation.lat) * dy;

                waypoints.push({ lng: detourLng, lat: detourLat, proj });
              }

              waypoints.sort((a, b) => a.proj - b.proj);
              const waypointsStr = waypoints.map((w) => `${w.lng.toFixed(6)},${w.lat.toFixed(6)}`).join(';');
              const coordStr = `${startCoord};${waypointsStr};${destCoord}`;

              try {
                const osrmRoutes = await fetchOSRM(coordStr, false);
                if (osrmRoutes.length > 0) {
                  const coords = decodePolyline(osrmRoutes[0].geometry);
                  const geom: GeoJSON.LineString = { type: 'LineString', coordinates: coords };

                  if (!routeIntersectsBlacklist(geom, bufferedBlacklists)) {
                    const isDuplicate = validCleanRoutes.some(
                      (r) => Math.abs(r.distance - osrmRoutes[0].distance) < 100
                    );
                    if (!isDuplicate) {
                      validCleanRoutes.push({
                        id: `detour-${side}-${offsetDeg}`,
                        distance: osrmRoutes[0].distance,
                        duration: osrmRoutes[0].duration,
                        geometry: geom,
                        waypoints: waypoints.map((w) => `${w.lng.toFixed(6)},${w.lat.toFixed(6)}`),
                        summary: side === 1 ? 'Left Detour' : 'Right Detour',
                      });
                      foundForThisSide = true;
                      break;
                    }
                  }
                }
              } catch {}
            }

            if (validCleanRoutes.length >= 2) break;
            if (!foundForThisSide) continue;
          }

          if (validCleanRoutes.length > 0) {
            usedTier = tier;
            break; // Clean route found! Stop falling back
          }
        }

        // Always result in a route: if all clean attempts failed, fallback to best available direct route
        if (validCleanRoutes.length === 0 && directCandidate) {
          validCleanRoutes.push(directCandidate);
          usedTier = 'minimal';
        }

        validCleanRoutes.sort((a, b) => a.duration - b.duration);

        if (validCleanRoutes.length === 0) {
          showToast('⚠️ No routing network connection available.');
          return;
        }

        setAllRoutes(validCleanRoutes);
        setSelectedRouteIndex(0);
        setRouteInfo(validCleanRoutes[0]);
        renderRoutesOnMap(validCleanRoutes, 0);

        const altCount = validCleanRoutes.length - 1;
        const tierNotice = usedTier !== sensitivity ? ` (${usedTier.toUpperCase()} avoidance used)` : '';
        showToast(`Route calculated!${tierNotice}${altCount > 0 ? ` [${altCount} alt]` : ''}`);
      } catch (err) {
        console.error(err);
        showToast('Failed to calculate route. Try adjusting waypoints.');
      } finally {
        setCalculating(false);
      }
    },
    [map, blacklistItems, sensitivity, showToast, renderRoutesOnMap]
  );

  const clearRoute = useCallback(() => {
    setRouteInfo(null);
    setAllRoutes([]);
    setSelectedRouteIndex(0);
    if (!map) return;
    [0, 1, 2, 3, 4, 5].forEach((idx) => {
      if (map.getLayer(`alt-route-${idx}-line`)) map.removeLayer(`alt-route-${idx}-line`);
      if (map.getLayer(`alt-route-${idx}-outline`)) map.removeLayer(`alt-route-${idx}-outline`);
      if (map.getSource(`alt-route-${idx}`)) map.removeSource(`alt-route-${idx}`);
    });
    if (map.getLayer('route-line')) map.removeLayer('route-line');
    if (map.getLayer('route-outline')) map.removeLayer('route-outline');
    if (map.getSource('route')) map.removeSource('route');
  }, [map]);

  return {
    routeInfo,
    allRoutes,
    selectedRouteIndex,
    selectRoute,
    calculating,
    calculateRoute,
    clearRoute,
  };
}
