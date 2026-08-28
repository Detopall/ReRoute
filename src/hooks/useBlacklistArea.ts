import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { reverseGeocodeDetails } from '../utils/nominatim';
import type { BlacklistItem, InteractionMode } from '../types';

interface UseBlacklistAreaOptions {
  map: maplibregl.Map | null;
  mapReady: boolean;
  styleLoaded?: boolean;
  mode: InteractionMode;
  showToast: (msg: string) => void;
  onAdd: (item: BlacklistItem) => void;
  onUpdateLabel: (id: string, label: string, region?: string) => void;
  onModeChange: (mode: InteractionMode) => void;
}

export function useBlacklistArea({
  map,
  mapReady,
  styleLoaded = true,
  mode,
  showToast,
  onAdd,
  onUpdateLabel,
  onModeChange,
}: UseBlacklistAreaOptions) {
  const pointsRef = useRef<[number, number][]>([]);

  useEffect(() => {
    if (!map || !mapReady || !styleLoaded || !map.isStyleLoaded() || mode !== 'blacklist-area') return;

    pointsRef.current = [];
    map.doubleClickZoom.disable();

    if (!map.getSource('drawing')) {
      map.addSource('drawing', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'drawing-fill',
        type: 'fill',
        source: 'drawing',
        filter: ['==', ['get', 'type'], 'polygon'],
        paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.15 },
      });
      map.addLayer({
        id: 'drawing-line',
        type: 'line',
        source: 'drawing',
        filter: ['==', ['get', 'type'], 'line'],
        paint: { 'line-color': '#ef4444', 'line-width': 2, 'line-dasharray': [3, 2] },
      });
      map.addLayer({
        id: 'drawing-points',
        type: 'circle',
        source: 'drawing',
        filter: ['==', ['get', 'type'], 'point'],
        paint: { 'circle-color': '#ef4444', 'circle-radius': 5, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 },
      });
    }

    const setDrawingData = (cursor?: [number, number]) => {
      const pts = pointsRef.current;
      const features: GeoJSON.Feature[] = pts.map((pt, idx) => ({
        type: 'Feature',
        properties: { type: 'point', index: idx },
        geometry: { type: 'Point', coordinates: pt },
      }));

      if (pts.length > 0) {
        const line = cursor ? [...pts, cursor] : [...pts];
        if (line.length >= 2) {
          features.push({
            type: 'Feature',
            properties: { type: 'line' },
            geometry: { type: 'LineString', coordinates: line },
          });
        }
        if (pts.length >= 2) {
          const poly = cursor ? [...pts, cursor, pts[0]] : [...pts, pts[0]];
          features.push({
            type: 'Feature',
            properties: { type: 'polygon' },
            geometry: { type: 'Polygon', coordinates: [poly] },
          });
        }
      }

      const src = map.getSource('drawing') as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features });
    };

    const cleanup = () => {
      for (const id of ['drawing-fill', 'drawing-line', 'drawing-points']) {
        if (map.getLayer(id)) map.removeLayer(id);
      }
      if (map.getSource('drawing')) map.removeSource('drawing');
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      pointsRef.current.push([e.lngLat.lng, e.lngLat.lat]);
      setDrawingData([e.lngLat.lng, e.lngLat.lat]);
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      if (pointsRef.current.length > 0) setDrawingData([e.lngLat.lng, e.lngLat.lat]);
    };

    const onDblClick = (e: maplibregl.MapMouseEvent) => {
      e.preventDefault();
      let pts = [...pointsRef.current];

      // Remove duplicate click point added by browser's double click event sequence
      if (pts.length >= 2) {
        const last = pts[pts.length - 1];
        const prev = pts[pts.length - 2];
        if (Math.abs(last[0] - prev[0]) < 0.0001 && Math.abs(last[1] - prev[1]) < 0.0001) {
          pts.pop();
        }
      }

      if (pts.length < 3) {
        showToast('Need at least 3 points to create an area');
        return;
      }

      const id = `area-${Date.now()}`;
      const coordinates = [...pts, pts[0]];
      const geometry: GeoJSON.Polygon = { type: 'Polygon', coordinates: [coordinates] };

      const centroidLng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const centroidLat = pts.reduce((s, p) => s + p[1], 0) / pts.length;

      cleanup();
      pointsRef.current = [];

      const label = `Area (${pts.length} points)`;
      const item: BlacklistItem = { id, type: 'area', label, geometry, createdAt: new Date() };
      onAdd(item);
      onModeChange('none');

      reverseGeocodeDetails(centroidLat, centroidLng).then(({ region }) => {
        if (region) onUpdateLabel(id, label, region);
      });
    };

    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', onClick);
    map.on('mousemove', onMouseMove);
    map.on('dblclick', onDblClick);

    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMouseMove);
      map.off('dblclick', onDblClick);
      map.getCanvas().style.cursor = '';
      map.doubleClickZoom.enable();
      cleanup();
    };
  }, [map, mapReady, styleLoaded, mode, showToast, onAdd, onUpdateLabel, onModeChange]);
}
