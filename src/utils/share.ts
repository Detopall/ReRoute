import type { LatLng, BlacklistItem } from '../types';

export interface ShareState {
  startLocation: LatLng | null;
  destLocation: LatLng | null;
  startText?: string;
  destText?: string;
  blacklistItems: BlacklistItem[];
}

export function encodeStateToHash(state: ShareState): string {
  try {
    const payload = {
      s: state.startLocation ? [state.startLocation.lat, state.startLocation.lng] : null,
      d: state.destLocation ? [state.destLocation.lat, state.destLocation.lng] : null,
      st: state.startText || '',
      dt: state.destText || '',
      b: state.blacklistItems.map(item => ({
        i: item.id,
        t: item.type,
        l: item.label,
        r: item.region,
        g: item.geometry,
      })),
    };
    const json = JSON.stringify(payload);
    const encoded = btoa(encodeURIComponent(json));
    return `#data=${encoded}`;
  } catch (e) {
    console.error('Failed to encode state to hash:', e);
    return '';
  }
}

export function decodeHashToState(input: string): ShareState | null {
  try {
    if (!input) return null;
    let raw = input.trim();
    if (raw.includes('#data=')) {
      raw = raw.split('#data=')[1];
    } else if (raw.includes('data=')) {
      raw = raw.split('data=')[1];
    }
    raw = raw.split('&')[0];
    if (!raw) return null;

    const json = decodeURIComponent(atob(raw));
    const payload = JSON.parse(json);

    return {
      startLocation: payload.s ? { lat: payload.s[0], lng: payload.s[1] } : null,
      destLocation: payload.d ? { lat: payload.d[0], lng: payload.d[1] } : null,
      startText: payload.st || '',
      destText: payload.dt || '',
      blacklistItems: Array.isArray(payload.b)
        ? payload.b.map((item: any) => ({
            id: item.i || `imported-${Date.now()}`,
            type: item.t,
            label: item.l,
            region: item.r,
            geometry: item.g,
            createdAt: new Date(),
          }))
        : [],
    };
  } catch (e) {
    console.error('Failed to decode input string to state:', e);
    return null;
  }
}
