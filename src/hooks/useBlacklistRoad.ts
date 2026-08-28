import { useEffect } from 'react';
import * as maplibregl from 'maplibre-gl';
import { isRoadFeature, getRoadSegmentBetweenIntersections, makeSegmentFeatureCollection } from '../utils/geo';
import { reverseGeocodeDetails } from '../utils/nominatim';
import type { BlacklistItem, InteractionMode } from '../types';

interface UseBlacklistRoadOptions {
  map: maplibregl.Map | null;
  mapReady: boolean;
  styleLoaded?: boolean;
  mode: InteractionMode;
  showToast: (msg: string) => void;
  onAdd: (item: BlacklistItem) => void;
  onRemove: (id: string) => void;
  onUpdateLabel: (id: string, label: string, region?: string) => void;
  onModeChange?: (mode: InteractionMode) => void;
}

export function useBlacklistRoad({
  map,
  mapReady,
  styleLoaded = true,
  mode,
  showToast,
  onAdd,
  onRemove,
  onUpdateLabel,
  onModeChange,
}: UseBlacklistRoadOptions) {
  useEffect(() => {
    if (!map || !mapReady || !styleLoaded || !map.isStyleLoaded() || mode !== 'blacklist-road') return;

    if (!map.getSource('hover-road')) {
      map.addSource('hover-road', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'hover-road-line',
        type: 'line',
        source: 'hover-road',
        filter: ['==', ['get', 'type'], 'line'],
        paint: { 'line-color': '#f97316', 'line-width': 6, 'line-opacity': 0.65 },
      });
      map.addLayer({
        id: 'hover-road-endpoints',
        type: 'circle',
        source: 'hover-road',
        filter: ['==', ['get', 'type'], 'endpoint'],
        minzoom: 15,
        paint: { 'circle-color': '#f97316', 'circle-radius': 6, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 },
      });
    }

    const findRoad = (e: maplibregl.MapMouseEvent) => {
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - 5, e.point.y - 5],
        [e.point.x + 5, e.point.y + 5],
      ];
      return map.queryRenderedFeatures(bbox).find(isRoadFeature);
    };

    const getSegment = (feature: maplibregl.MapGeoJSONFeature, lngLat: maplibregl.LngLat) => {
      const others = map.queryRenderedFeatures().filter(
        (f) => f.id !== feature.id && isRoadFeature(f)
      );
      return getRoadSegmentBetweenIntersections(feature, lngLat, others);
    };

    const clearHover = () => {
      (map.getSource('hover-road') as maplibregl.GeoJSONSource)
        ?.setData({ type: 'FeatureCollection', features: [] });
    };

    const onMouseMove = (e: maplibregl.MapMouseEvent) => {
      const road = findRoad(e);
      const src = map.getSource('hover-road') as maplibregl.GeoJSONSource;
      if (road && src) {
        src.setData(makeSegmentFeatureCollection(getSegment(road, e.lngLat)));
      } else {
        src?.setData({ type: 'FeatureCollection', features: [] });
      }
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const road = findRoad(e);
      const id = `road-${Date.now()}`;
      const point = e.lngLat;

      let geometry: GeoJSON.LineString;
      let label: string;

      if (road) {
        geometry = getSegment(road, point);
        const name = road.properties?.name || road.properties?.name_en || road.properties?.ref;
        if (name && name !== 'Unnamed Road') {
          label = name;
        } else {
          const cls = road.properties?.class || road.properties?.subclass || 'road';
          label = `${cls.charAt(0).toUpperCase()}${cls.slice(1)} near ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
        }
      } else {
        const offset = 0.0005;
        geometry = {
          type: 'LineString',
          coordinates: [[point.lng - offset, point.lat], [point.lng + offset, point.lat]],
        };
        label = `Custom Point (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`;
      }

      const hasNameInTile = !!(road?.properties?.name && road.properties.name !== 'Unnamed Road');

      reverseGeocodeDetails(point.lat, point.lng).then(({ streetName, region }) => {
        const resolvedLabel = !hasNameInTile && streetName ? streetName : label;
        onUpdateLabel(id, resolvedLabel, region ?? undefined);
      });

      const item: BlacklistItem = { id, type: 'road', label, geometry, createdAt: new Date() };
      onAdd(item);
      clearHover();
    };

    map.getCanvas().style.cursor = 'crosshair';
    map.on('mousemove', onMouseMove);
    map.on('click', onClick);

    return () => {
      map.off('mousemove', onMouseMove);
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
      if (map.getLayer('hover-road-line')) map.removeLayer('hover-road-line');
      if (map.getLayer('hover-road-endpoints')) map.removeLayer('hover-road-endpoints');
      if (map.getSource('hover-road')) map.removeSource('hover-road');
    };
  }, [map, mapReady, styleLoaded, mode, showToast, onAdd, onRemove, onUpdateLabel, onModeChange]);
}
