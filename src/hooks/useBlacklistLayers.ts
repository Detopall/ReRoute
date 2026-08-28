import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { makeSegmentFeatureCollection } from '../utils/geo';
import type { BlacklistItem } from '../types';

interface UseBlacklistLayersOptions {
  map: maplibregl.Map | null;
  mapReady: boolean;
  styleLoaded: boolean;
  blacklistItems: BlacklistItem[];
  selectedBlacklistId: string | null;
  hoveredBlacklistId: string | null;
}

export function useBlacklistLayers({
  map,
  mapReady,
  styleLoaded,
  blacklistItems,
  selectedBlacklistId,
  hoveredBlacklistId,
}: UseBlacklistLayersOptions) {
  const renderedIdsRef = useRef<Set<string>>(new Set());

  // Clear rendered tracker whenever style is reloaded
  useEffect(() => {
    if (!styleLoaded) {
      renderedIdsRef.current.clear();
    }
  }, [styleLoaded]);

  // Reactive map sync for blacklist items
  useEffect(() => {
    if (!map || !mapReady || !styleLoaded || !map.isStyleLoaded()) return;
    const currentIds = new Set(blacklistItems.map((i) => i.id));
    const rendered = renderedIdsRef.current;

    for (const id of Array.from(rendered)) {
      if (!currentIds.has(id)) {
        for (const suffix of ['-line', '-fill', '-endpoints']) {
          if (map.getLayer(`${id}${suffix}`)) map.removeLayer(`${id}${suffix}`);
        }
        if (map.getSource(id)) map.removeSource(id);
        rendered.delete(id);
      }
    }

    for (const item of blacklistItems) {
      const sourceExists = !!map.getSource(item.id);
      if (sourceExists) {
        const src = map.getSource(item.id) as maplibregl.GeoJSONSource;
        try {
          if (item.type === 'road') {
            src.setData(makeSegmentFeatureCollection(item.geometry as GeoJSON.LineString));
          } else {
            src.setData({ type: 'Feature', properties: {}, geometry: item.geometry });
          }
        } catch {}
        continue;
      }

      try {
        if (item.type === 'road') {
          const fc = makeSegmentFeatureCollection(item.geometry as GeoJSON.LineString);
          map.addSource(item.id, { type: 'geojson', data: fc });
          map.addLayer({
            id: `${item.id}-line`,
            type: 'line',
            source: item.id,
            filter: ['==', ['get', 'type'], 'line'],
            paint: { 'line-color': '#dc2626', 'line-width': 7, 'line-opacity': 0.95 },
          });
          map.addLayer({
            id: `${item.id}-endpoints`,
            type: 'circle',
            source: item.id,
            filter: ['==', ['get', 'type'], 'endpoint'],
            minzoom: 15,
            paint: { 'circle-color': '#dc2626', 'circle-radius': 7, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 },
          });
        } else {
          map.addSource(item.id, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: item.geometry } });
          map.addLayer({
            id: `${item.id}-fill`,
            type: 'fill',
            source: item.id,
            paint: { 'fill-color': '#ea580c', 'fill-opacity': 0.45 },
          });
          map.addLayer({
            id: `${item.id}-line`,
            type: 'line',
            source: item.id,
            paint: { 'line-color': '#b91c1c', 'line-width': 3 },
          });
        }
        rendered.add(item.id);
      } catch {}
    }
  }, [blacklistItems, map, mapReady, styleLoaded]);

  // Hover & selection highlighting
  useEffect(() => {
    if (!map || !mapReady || !styleLoaded || !map.isStyleLoaded()) return;
    blacklistItems.forEach((item) => {
      const isSelected = item.id === selectedBlacklistId;
      const isHovered = item.id === hoveredBlacklistId;
      const lineColor = isSelected || isHovered ? '#ff2233' : item.type === 'road' ? '#dc2626' : '#b91c1c';
      const fillColor = isSelected || isHovered ? '#ff6600' : '#ea580c';

      try {
        if (map.getLayer(`${item.id}-line`)) {
          map.setPaintProperty(`${item.id}-line`, 'line-color', lineColor);
          map.setPaintProperty(`${item.id}-line`, 'line-width', item.type === 'area' ? (isSelected ? 4 : 3) : (isSelected ? 9 : 7));
        }
        if (item.type === 'area' && map.getLayer(`${item.id}-fill`)) {
          map.setPaintProperty(`${item.id}-fill`, 'fill-color', fillColor);
          map.setPaintProperty(`${item.id}-fill`, 'fill-opacity', isSelected ? 0.6 : 0.45);
        }
      } catch {}
    });
  }, [hoveredBlacklistId, selectedBlacklistId, blacklistItems, map, mapReady, styleLoaded]);

  return { renderedIdsRef };
}
