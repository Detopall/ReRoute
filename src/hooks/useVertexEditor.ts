import { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { BlacklistItem } from '../types';

interface UseVertexEditorOptions {
  map: maplibregl.Map | null;
  mapReady: boolean;
  selectedId: string | null;
  blacklistItems: BlacklistItem[];
  onUpdateGeometry: (id: string, newGeometry: GeoJSON.Geometry) => void;
}

export function useVertexEditor({
  map,
  mapReady,
  selectedId,
  blacklistItems,
  onUpdateGeometry,
}: UseVertexEditorOptions) {
  const vertexMarkersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    // Clear previous markers
    vertexMarkersRef.current.forEach((m) => m.remove());
    vertexMarkersRef.current = [];

    if (!map || !mapReady || !selectedId) return;

    const item = blacklistItems.find((i) => i.id === selectedId);
    if (!item || item.type !== 'area' || item.geometry.type !== 'Polygon') return;

    const ring = item.geometry.coordinates[0];
    if (!ring || ring.length < 3) return;

    // We don't need a handle for the closing vertex if it's identical to ring[0]
    const vertexCoords = ring.slice(0, ring.length - 1);

    vertexCoords.forEach((coord, vIdx) => {
      const el = document.createElement('div');
      el.className = 'vertex-handle';
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.backgroundColor = '#f97316';
      el.style.border = '2px solid #ffffff';
      el.style.borderRadius = '50%';
      el.style.cursor = 'grab';
      el.style.boxShadow = '0 0 6px rgba(0,0,0,0.5)';

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([coord[0], coord[1]])
        .addTo(map);

      marker.on('dragend', () => {
        const newLngLat = marker.getLngLat();
        const updatedRing = [...vertexCoords.map((c) => [...c] as [number, number])];
        updatedRing[vIdx] = [newLngLat.lng, newLngLat.lat];
        // Re-close polygon
        const closedRing = [...updatedRing, updatedRing[0]];
        const newGeometry: GeoJSON.Polygon = {
          type: 'Polygon',
          coordinates: [closedRing],
        };
        onUpdateGeometry(item.id, newGeometry);
      });

      vertexMarkersRef.current.push(marker);
    });

    return () => {
      vertexMarkersRef.current.forEach((m) => m.remove());
      vertexMarkersRef.current = [];
    };
  }, [map, mapReady, selectedId, blacklistItems, onUpdateGeometry]);
}
