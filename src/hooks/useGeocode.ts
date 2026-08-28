import { useCallback, useRef, useState } from 'react';
import type { NominatimResult } from '../types';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export function useGeocode() {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    // Cancel previous request
    if (abortRef.current) abortRef.current.abort();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const params = new URLSearchParams({
          q: query,
          format: 'json',
          limit: '5',
          addressdetails: '1',
        });

        const res = await fetch(`${NOMINATIM_URL}?${params}`, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'ReRoute/0.1 (dev)',
          },
        });

        if (!res.ok) throw new Error('Geocoding failed');

        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Geocoding error:', err);
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  const clear = useCallback(() => {
    setSuggestions([]);
  }, []);

  return { suggestions, loading, search, clear };
}
