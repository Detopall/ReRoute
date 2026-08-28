import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ThemeMode } from '../types';

const STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

const DEFAULT_NYC: [number, number] = [-74.0060, 40.7128];

export function useMap(containerId: string, theme: ThemeMode = 'dark') {
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const currentThemeRef = useRef<ThemeMode>(theme);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: STYLES[theme],
      center: DEFAULT_NYC,
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-right'
    );

    map.on('load', () => {
      setMapReady(true);
      setStyleLoaded(true);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            map.flyTo({
              center: [pos.coords.longitude, pos.coords.latitude],
              zoom: 13,
            });
          },
          () => {},
          { timeout: 5000 }
        );
      }
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {}
        mapRef.current = null;
        setMapReady(false);
        setStyleLoaded(false);
      }
    };
  }, [containerId]);

  // Handle theme style changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (currentThemeRef.current === theme) return;

    currentThemeRef.current = theme;
    setStyleLoaded(false);
    map.setStyle(STYLES[theme]);

    const checkLoaded = () => {
      if (map.isStyleLoaded()) {
        setStyleLoaded(true);
      }
    };

    map.on('styledata', checkLoaded);
    map.once('idle', checkLoaded);

    return () => {
      map.off('styledata', checkLoaded);
    };
  }, [theme, mapReady]);

  return { map: mapRef.current, mapReady, styleLoaded };
}
