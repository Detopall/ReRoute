export interface LatLng {
  lat: number;
  lng: number;
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: Record<string, string>;
}

export interface BlacklistItem {
  id: string;
  type: 'road' | 'area';
  label: string;
  region?: string;
  geometry: GeoJSON.Geometry;
  createdAt: Date;
}

export interface RouteInfo {
  id?: string;
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString;
  waypoints?: string[]; // Array of lng,lat string waypoints used for the detour
  summary?: string;
  alternatives?: RouteInfo[];
}

export type InteractionMode = 'none' | 'blacklist-road' | 'blacklist-area' | 'select-start' | 'select-destination' | 'edit-vertex';

export type ThemeMode = 'dark' | 'light';

export type AvoidanceSensitivity = 'strict' | 'balanced' | 'relaxed';
