import { useState, useRef, useEffect } from 'react';
import { MapPin, Map, Navigation, Loader2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useGeocode } from '../hooks/useGeocode';
import type { NominatimResult, LatLng } from '../types';

interface LocationInputProps {
  label: string;
  placeholder: string;
  icon: 'start' | 'destination';
  value: string;
  onValueChange: (val: string) => void;
  onSelect: (location: LatLng, displayName: string) => void;
  onSelectOnMap?: () => void;
  isSelectingOnMap?: boolean;
}

export function LocationInput({
  label,
  placeholder,
  icon,
  value,
  onValueChange,
  onSelect,
  onSelectOnMap,
  isSelectingOnMap,
}: LocationInputProps) {
  const { suggestions, loading, search, clear } = useGeocode();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onValueChange(val);
    search(val);
    setShowSuggestions(true);
  }

  function handleSelect(result: NominatimResult) {
    onValueChange(result.display_name);
    onSelect(
      { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
      result.display_name
    );
    setShowSuggestions(false);
    clear();
  }

  const Icon = icon === 'start' ? Navigation : MapPin;
  const iconColor = icon === 'start' ? 'text-green-500' : 'text-red-500';

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        {label}
      </label>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Icon className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${iconColor}`} />
          <Input
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            onFocus={() => { if (value) setShowSuggestions(true); }}
            className="pl-9 pr-4 h-10 bg-background/50 backdrop-blur-sm"
          />
        </div>
        {onSelectOnMap && (
          <Button
            variant={isSelectingOnMap ? 'default' : 'outline'}
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={onSelectOnMap}
            title="Select on map"
          >
            <Map className="h-4 w-4" />
          </Button>
        )}

        {showSuggestions && (suggestions.length > 0 || loading) && (
          <ul className="absolute top-full left-0 right-12 mt-1 py-1 bg-popover text-popover-foreground rounded-md shadow-md border border-border z-50 max-h-60 overflow-y-auto">
            {loading && (
              <li className="flex items-center justify-center p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Searching...
              </li>
            )}
            {!loading && suggestions.map((s) => (
              <li
                key={s.place_id}
                className="px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer flex flex-col"
                onClick={() => handleSelect(s)}
              >
                <span className="font-medium truncate">{s.display_name.split(',')[0]}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {s.display_name.split(',').slice(1).join(',')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
