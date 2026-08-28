import { LocationInput } from './LocationInput';
import { Button } from './ui/button';
import { Route as RouteIcon, Loader2, ShieldAlert, Shield, ShieldCheck } from 'lucide-react';
import type { LatLng, InteractionMode, AvoidanceSensitivity } from '../types';

interface RoutePlanningSectionProps {
  startText: string;
  destText: string;
  startLocation: LatLng | null;
  destLocation: LatLng | null;
  mode: InteractionMode;
  calculating: boolean;
  canCalculate: boolean;
  sensitivity: AvoidanceSensitivity;
  onSensitivityChange: (s: AvoidanceSensitivity) => void;
  onStartTextChange: (val: string) => void;
  onDestTextChange: (val: string) => void;
  onStartSelect: (loc: LatLng, name: string) => void;
  onDestSelect: (loc: LatLng, name: string) => void;
  onSetMode: (mode: InteractionMode) => void;
  onCalculateRoute: () => void;
}

export function RoutePlanningSection({
  startText,
  destText,
  mode,
  calculating,
  canCalculate,
  sensitivity,
  onSensitivityChange,
  onStartTextChange,
  onDestTextChange,
  onStartSelect,
  onDestSelect,
  onSetMode,
  onCalculateRoute,
}: RoutePlanningSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <RouteIcon className="h-4 w-4 text-indigo-400" />
        <h2 className="text-sm font-semibold text-foreground">Route Planning</h2>
      </div>

      <LocationInput
        label="Start"
        placeholder="Starting location..."
        icon="start"
        value={startText}
        onValueChange={onStartTextChange}
        onSelect={onStartSelect}
        onSelectOnMap={() => onSetMode(mode === 'select-start' ? 'none' : 'select-start')}
        isSelectingOnMap={mode === 'select-start'}
      />

      <LocationInput
        label="Destination"
        placeholder="Where to?"
        icon="destination"
        value={destText}
        onValueChange={onDestTextChange}
        onSelect={onDestSelect}
        onSelectOnMap={() => onSetMode(mode === 'select-destination' ? 'none' : 'select-destination')}
        isSelectingOnMap={mode === 'select-destination'}
      />

      {/* Sensitivity Selector */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
          <span>Avoidance Clearance</span>
          <span className="capitalize text-indigo-400 font-semibold">{sensitivity}</span>
        </label>
        <div className="grid grid-cols-3 gap-1 p-1 bg-secondary/40 rounded-lg border border-border/50">
          <button
            type="button"
            onClick={() => onSensitivityChange('strict')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
              sensitivity === 'strict'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Strict: Wide 40m/20m clearance around blacklists"
          >
            <ShieldAlert className="h-3.5 w-3.5 mb-0.5" />
            Strict
          </button>
          <button
            type="button"
            onClick={() => onSensitivityChange('balanced')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
              sensitivity === 'balanced'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Balanced: Standard 20m/8m clearance"
          >
            <Shield className="h-3.5 w-3.5 mb-0.5" />
            Balanced
          </button>
          <button
            type="button"
            onClick={() => onSensitivityChange('relaxed')}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
              sensitivity === 'relaxed'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
            }`}
            title="Relaxed: Tight 8m/3m clearance, prioritizes finding any route"
          >
            <ShieldCheck className="h-3.5 w-3.5 mb-0.5" />
            Relaxed
          </button>
        </div>
      </div>

      <Button
        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all"
        disabled={!canCalculate}
        onClick={onCalculateRoute}
      >
        {calculating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <RouteIcon className="mr-2 h-4 w-4" />
            Calculate Route
          </>
        )}
      </Button>
    </section>
  );
}
