import { Map as MapIcon, X, Navigation, Share2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import type { RouteInfo } from '../types';

interface RouteInfoProps {
  distance: number;
  duration: number;
  allRoutes?: RouteInfo[];
  selectedIndex?: number;
  onSelectRoute?: (index: number) => void;
  onClear: () => void;
  onOpenGoogleMaps: () => void;
  onShare?: () => void;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes} min`;
}

export function RouteInfoPanel({
  distance,
  duration,
  allRoutes = [],
  selectedIndex = 0,
  onSelectRoute,
  onClear,
  onOpenGoogleMaps,
  onShare,
}: RouteInfoProps) {
  const mainDuration = allRoutes[0]?.duration || duration;

  return (
    <Card className="bg-background/50 backdrop-blur-md border-border/50 shadow-sm mt-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-foreground">Route Details</h3>
          </div>
          {onShare && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1 px-2.5"
              onClick={onShare}
              title="Share route link"
            >
              <Share2 className="h-3 w-3" />
              Share
            </Button>
          )}
        </div>

        {/* Route Alternatives Selection Tabs */}
        {allRoutes.length > 1 && (
          <div className="flex gap-1.5 p-1 bg-secondary/40 rounded-lg border border-border/40 overflow-x-auto">
            {allRoutes.map((r, idx) => {
              const isActive = idx === selectedIndex;
              const diffMin = Math.round((r.duration - mainDuration) / 60);
              const diffLabel = idx === 0 ? 'Main' : diffMin >= 0 ? `+${diffMin}m` : `${diffMin}m`;

              return (
                <button
                  key={r.id || idx}
                  onClick={() => onSelectRoute?.(idx)}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex flex-col items-center justify-center min-w-[70px] ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'hover:bg-secondary/80 text-muted-foreground'
                  }`}
                >
                  <span className="font-bold">{formatDuration(r.duration)}</span>
                  <span className="text-[10px] opacity-80">{diffLabel}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Distance
            </span>
            <span className="text-lg font-bold text-foreground">
              {formatDistance(distance)}
            </span>
          </div>
          <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Duration
            </span>
            <span className="text-lg font-bold text-foreground">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={onOpenGoogleMaps} 
            className="flex-1 text-xs h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <MapIcon className="mr-2 h-3.5 w-3.5" />
            Google Maps
          </Button>
          <Button 
            variant="ghost" 
            onClick={onClear} 
            className="px-3 h-9 hover:bg-destructive/10 hover:text-destructive"
            title="Clear Route"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
