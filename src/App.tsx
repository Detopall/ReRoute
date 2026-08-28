import { useState, useCallback, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import { useMap } from './hooks/useMap';
import { useRoute } from './hooks/useRoute';
import { reverseGeocodeDetails } from './utils/nominatim';
import { useBlacklistRoad } from './hooks/useBlacklistRoad';
import { useBlacklistArea } from './hooks/useBlacklistArea';
import { useBlacklistLayers } from './hooks/useBlacklistLayers';
import { useLocationSelect } from './hooks/useLocationSelect';
import { useHistory } from './hooks/useHistory';
import { useVertexEditor } from './hooks/useVertexEditor';
import { encodeStateToHash, decodeHashToState } from './utils/share';
import { Header } from './components/Header';
import { RoutePlanningSection } from './components/RoutePlanningSection';
import { ImportCodePanel } from './components/ImportCodePanel';
import { BlacklistPanel } from './components/BlacklistPanel';
import { RouteInfoPanel } from './components/RouteInfoPanel';
import { Toast } from './components/Toast';
import { ModeIndicator } from './components/ModeIndicator';
import { ScrollArea } from './components/ui/scroll-area';
import type { LatLng, BlacklistItem, InteractionMode, NominatimResult, ThemeMode } from './types';

const STORAGE_KEY = 'reroute_blacklists_v1';
const THEME_STORAGE_KEY = 'reroute_theme_v1';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    } catch {}
    return 'dark';
  });

  const { map, mapReady, styleLoaded } = useMap('map', theme);

  const [startText, setStartText] = useState('');
  const [destText, setDestText] = useState('');
  const [startLocation, setStartLocation] = useState<LatLng | null>(null);
  const [destLocation, setDestLocation] = useState<LatLng | null>(null);

  const {
    state: blacklistItems,
    setState: setBlacklistItems,
    resetState: resetBlacklistItems,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<BlacklistItem>([]);

  const [selectedBlacklistId, setSelectedBlacklistId] = useState<string | null>(null);
  const [mode, setMode] = useState<InteractionMode>('none');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hoveredBlacklistId, setHoveredBlacklistId] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState<AvoidanceSensitivity>('balanced');

  const startMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);

  const showToast = useCallback((msg: string) => setToastMessage(msg), []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const placeMarker = useCallback(
    (location: LatLng, type: 'start' | 'dest', markerRef: React.MutableRefObject<maplibregl.Marker | null>) => {
      if (!map) return;
      markerRef.current?.remove();
      const el = document.createElement('div');
      el.className = `marker marker--${type}`;
      el.style.cursor = 'grab';

      const marker = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([location.lng, location.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        const newLoc: LatLng = { lat: lngLat.lat, lng: lngLat.lng };
        if (type === 'start') {
          setStartLocation(newLoc);
        } else {
          setDestLocation(newLoc);
        }
        reverseGeocodeDetails(newLoc.lat, newLoc.lng).then(({ streetName }) => {
          const name = streetName || `${newLoc.lat.toFixed(4)}, ${newLoc.lng.toFixed(4)}`;
          if (type === 'start') setStartText(name);
          else setDestText(name);
        });
      });

      markerRef.current = marker;
      map.flyTo({ center: [location.lng, location.lat], zoom: 13 });
    },
    [map]
  );

  // Initial load from URL hash or localStorage
  useEffect(() => {
    const hashData = decodeHashToState(window.location.hash);
    if (hashData) {
      if (hashData.startLocation) {
        setStartLocation(hashData.startLocation);
        setStartText(hashData.startText || `${hashData.startLocation.lat.toFixed(4)}, ${hashData.startLocation.lng.toFixed(4)}`);
        placeMarker(hashData.startLocation, 'start', startMarkerRef);
      }
      if (hashData.destLocation) {
        setDestLocation(hashData.destLocation);
        setDestText(hashData.destText || `${hashData.destLocation.lat.toFixed(4)}, ${hashData.destLocation.lng.toFixed(4)}`);
        placeMarker(hashData.destLocation, 'dest', destMarkerRef);
      }
      if (hashData.blacklistItems.length > 0) {
        resetBlacklistItems(hashData.blacklistItems);
      }
      showToast('Loaded shared route');
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const items = parsed.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt || Date.now()),
          }));
          resetBlacklistItems(items);
        }
      }
    } catch {}
  }, [resetBlacklistItems, placeMarker, showToast]);

  // Persist blacklists
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blacklistItems));
    } catch {}
  }, [blacklistItems]);

  // Update URL hash state
  useEffect(() => {
    if (!startLocation && !destLocation && blacklistItems.length === 0) return;
    const hash = encodeStateToHash({ startLocation, destLocation, startText, destText, blacklistItems });
    if (hash) window.history.replaceState(null, '', hash);
  }, [startLocation, destLocation, startText, destText, blacklistItems]);

  // Keybindings (Escape, Undo, Redo)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMode('none');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const handleStartSelect = useCallback((loc: LatLng, name: string) => {
    setStartLocation(loc);
    setStartText(name);
    placeMarker(loc, 'start', startMarkerRef);
  }, [placeMarker]);

  const handleDestSelect = useCallback((loc: LatLng, name: string) => {
    setDestLocation(loc);
    setDestText(name);
    placeMarker(loc, 'dest', destMarkerRef);
  }, [placeMarker]);

  const handleRemoveBlacklist = useCallback((id: string) => {
    setBlacklistItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedBlacklistId === id) setSelectedBlacklistId(null);
  }, [setBlacklistItems, selectedBlacklistId]);

  const handleClearAllBlacklists = useCallback(() => {
    setBlacklistItems([]);
    setSelectedBlacklistId(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    showToast('Cleared all blacklists');
  }, [setBlacklistItems, showToast]);

  const handleAddBlacklist = useCallback((item: BlacklistItem) => {
    setBlacklistItems((prev) => {
      showToast(`Added: ${item.label}`);
      return [...prev, item];
    });
  }, [setBlacklistItems, showToast]);

  const handleUpdateBlacklistLabel = useCallback((id: string, label: string, region?: string) => {
    setBlacklistItems((prev) => prev.map((i) => (i.id === id ? { ...i, label, region } : i)));
  }, [setBlacklistItems]);

  const handleUpdateGeometry = useCallback((id: string, newGeometry: GeoJSON.Geometry) => {
    setBlacklistItems((prev) => prev.map((i) => (i.id === id ? { ...i, geometry: newGeometry } : i)));
    showToast('Updated zone shape');
  }, [setBlacklistItems, showToast]);

  const handleImportBlacklists = useCallback((imported: BlacklistItem[]) => {
    setBlacklistItems([]);
    setTimeout(() => {
      resetBlacklistItems(imported);
      showToast(`Imported ${imported.length} blacklist item(s)`);
    }, 50);
  }, [resetBlacklistItems, setBlacklistItems, showToast]);

  const handleSearchNavigation = useCallback((result: NominatimResult) => {
    if (!map) return;
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    searchMarkerRef.current?.remove();

    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundColor = '#6366f1';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.6)';

    searchMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
    map.flyTo({ center: [lng, lat], zoom: 15 });
    showToast(`📍 ${result.display_name.split(',')[0]}`);
  }, [map, showToast]);

  // Hook for map blacklists layer rendering
  useBlacklistLayers({
    map,
    mapReady,
    styleLoaded,
    blacklistItems,
    selectedBlacklistId,
    hoveredBlacklistId,
  });

  useVertexEditor({
    map,
    mapReady,
    selectedId: selectedBlacklistId,
    blacklistItems,
    onUpdateGeometry: handleUpdateGeometry,
  });

  const {
    routeInfo,
    allRoutes,
    selectedRouteIndex,
    selectRoute,
    calculating,
    calculateRoute,
    clearRoute,
  } = useRoute({ map, blacklistItems, showToast, sensitivity });

  useBlacklistRoad({ map, mapReady, styleLoaded, mode, showToast, onAdd: handleAddBlacklist, onRemove: handleRemoveBlacklist, onUpdateLabel: handleUpdateBlacklistLabel, onModeChange: setMode });
  useBlacklistArea({ map, mapReady, styleLoaded, mode, showToast, onAdd: handleAddBlacklist, onUpdateLabel: handleUpdateBlacklistLabel, onModeChange: setMode });
  useLocationSelect({ map, mapReady, mode, showToast, onStartSelect: handleStartSelect, onDestSelect: handleDestSelect, setStartText, setDestText, onModeChange: setMode });

  const handleStartTextChange = (t: string) => {
    setStartText(t);
    if (!t) { setStartLocation(null); startMarkerRef.current?.remove(); startMarkerRef.current = null; }
  };

  const handleDestTextChange = (t: string) => {
    setDestText(t);
    if (!t) { setDestLocation(null); destMarkerRef.current?.remove(); destMarkerRef.current = null; }
  };

  const handleClearEverything = useCallback(() => {
    clearRoute();
    handleStartTextChange('');
    handleDestTextChange('');
  }, [clearRoute]);

  const canCalculate = !!startLocation && !!destLocation && !calculating;

  const handleOpenGoogleMaps = useCallback(() => {
    if (!startLocation || !destLocation) return;
    let waypointsStr = '';
    if (routeInfo?.waypoints && routeInfo.waypoints.length > 0) {
      waypointsStr = routeInfo.waypoints.map((wp) => wp.split(',').reverse().join(',')).join('/') + '/';
    }
    window.open(`https://www.google.com/maps/dir/${startLocation.lat},${startLocation.lng}/${waypointsStr}${destLocation.lat},${destLocation.lng}`, '_blank');
  }, [startLocation, destLocation, routeInfo]);

  const handleShareLink = useCallback(() => {
    const hash = encodeStateToHash({ startLocation, destLocation, startText, destText, blacklistItems });
    if (hash) {
      navigator.clipboard.writeText(hash).then(() => {
        showToast('📋 Copied route code!');
      });
    }
  }, [startLocation, destLocation, startText, destText, blacklistItems, showToast]);

  const handleLoadUrlCode = useCallback((inputCode: string) => {
    const decoded = decodeHashToState(inputCode);
    if (!decoded) {
      showToast('❌ Invalid route code or link');
      return;
    }
    if (decoded.startLocation) {
      setStartLocation(decoded.startLocation);
      setStartText(decoded.startText || `${decoded.startLocation.lat.toFixed(4)}, ${decoded.startLocation.lng.toFixed(4)}`);
      placeMarker(decoded.startLocation, 'start', startMarkerRef);
    }
    if (decoded.destLocation) {
      setDestLocation(decoded.destLocation);
      setDestText(decoded.destText || `${decoded.destLocation.lat.toFixed(4)}, ${decoded.destLocation.lng.toFixed(4)}`);
      placeMarker(decoded.destLocation, 'dest', destMarkerRef);
    }
    if (decoded.blacklistItems) resetBlacklistItems(decoded.blacklistItems);

    showToast('📍 Loaded route & markers!');
    if (decoded.startLocation && decoded.destLocation) {
      const s = decoded.startLocation;
      const d = decoded.destLocation;
      setTimeout(() => calculateRoute(s, d), 300);
    }
  }, [placeMarker, resetBlacklistItems, calculateRoute, showToast]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      <aside className="w-[360px] h-full flex flex-col bg-card border-r border-border shadow-xl z-20 shrink-0">
        <Header theme={theme} onToggleTheme={toggleTheme} />

        <ScrollArea className="flex-1">
          <div className="p-5 space-y-6">
            <RoutePlanningSection
              startText={startText}
              destText={destText}
              startLocation={startLocation}
              destLocation={destLocation}
              mode={mode}
              calculating={calculating}
              canCalculate={canCalculate}
              sensitivity={sensitivity}
              onSensitivityChange={setSensitivity}
              onStartTextChange={handleStartTextChange}
              onDestTextChange={handleDestTextChange}
              onStartSelect={handleStartSelect}
              onDestSelect={handleDestSelect}
              onSetMode={setMode}
              onCalculateRoute={() => startLocation && destLocation && calculateRoute(startLocation, destLocation)}
            />

            <ImportCodePanel onLoadCode={handleLoadUrlCode} />

            <section>
              <BlacklistPanel
                items={blacklistItems}
                onRemove={handleRemoveBlacklist}
                onClearAll={handleClearAllBlacklists}
                onBlacklistRoad={() => setMode(mode === 'blacklist-road' ? 'none' : 'blacklist-road')}
                onBlacklistArea={() => setMode(mode === 'blacklist-area' ? 'none' : 'blacklist-area')}
                onHover={setHoveredBlacklistId}
                onSearchNavigation={handleSearchNavigation}
                onImport={handleImportBlacklists}
                onUndo={undo}
                onRedo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                selectedId={selectedBlacklistId}
                onSelectId={setSelectedBlacklistId}
                activeMode={mode}
              />
            </section>

            {routeInfo && (
              <RouteInfoPanel
                distance={routeInfo.distance}
                duration={routeInfo.duration}
                allRoutes={allRoutes}
                selectedIndex={selectedRouteIndex}
                onSelectRoute={selectRoute}
                onClear={handleClearEverything}
                onOpenGoogleMaps={handleOpenGoogleMaps}
                onShare={handleShareLink}
              />
            )}
          </div>
        </ScrollArea>
      </aside>

      <main className="relative flex-1 h-full bg-muted">
        <div id="map" className="absolute inset-0" />
        <ModeIndicator mode={mode} onCancel={() => setMode('none')} />
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      </main>
    </div>
  );
}
