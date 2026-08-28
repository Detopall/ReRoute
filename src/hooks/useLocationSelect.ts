import { useEffect } from 'react';
import * as maplibregl from 'maplibre-gl';
import { reverseGeocode } from '../utils/nominatim';
import type { LatLng, InteractionMode } from '../types';

interface UseLocationSelectOptions {
  map: maplibregl.Map | null;
  mapReady: boolean;
  mode: InteractionMode;
  showToast: (msg: string) => void;
  onStartSelect: (location: LatLng, label: string) => void;
  onDestSelect: (location: LatLng, label: string) => void;
  setStartText: (t: string) => void;
  setDestText: (t: string) => void;
  onModeChange: (mode: InteractionMode) => void;
}

export function useLocationSelect({
  map, mapReady, mode, showToast,
  onStartSelect, onDestSelect,
  setStartText, setDestText,
  onModeChange,
}: UseLocationSelectOptions) {
  useEffect(() => {
    if (!map || !mapReady) return;
    if (mode !== 'select-start' && mode !== 'select-destination') return;

    const isStart = mode === 'select-start';

    const onClick = async (e: maplibregl.MapMouseEvent) => {
      const { lat, lng } = e.lngLat;
      const coords: LatLng = { lat, lng };
      const placeholder = `Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

      if (isStart) onStartSelect(coords, placeholder);
      else onDestSelect(coords, placeholder);

      onModeChange('none');
      showToast(`${isStart ? 'Start' : 'Destination'} location set!`);

      const name = await reverseGeocode(lat, lng);
      if (name) {
        if (isStart) setStartText(name);
        else setDestText(name);
      }
    };

    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', onClick);

    return () => {
      map.off('click', onClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, mapReady, mode, showToast, onStartSelect, onDestSelect, setStartText, setDestText, onModeChange]);
}
