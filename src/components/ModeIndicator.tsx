import { X } from 'lucide-react';
import { Button } from './ui/button';
import type { InteractionMode } from '../types';

interface ModeIndicatorProps {
  mode: InteractionMode;
  onCancel: () => void;
}

export function ModeIndicator({ mode, onCancel }: ModeIndicatorProps) {
  if (mode === 'none') return null;

  let message = '';
  switch (mode) {
    case 'select-start':
      message = 'Click on the map to set Start Location';
      break;
    case 'select-destination':
      message = 'Click on the map to set Destination';
      break;
    case 'blacklist-road':
      message = 'Click on a road to blacklist it';
      break;
    case 'blacklist-area':
      message = 'Click points to draw an area, double-click to finish';
      break;
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center bg-popover text-popover-foreground rounded-full shadow-lg border border-border/50 pl-5 pr-2 py-1.5 animate-in slide-in-from-top-4 fade-in">
      <span className="text-sm font-medium">{message}</span>
      <div className="w-[1px] h-4 bg-border mx-3" />
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={onCancel}
        className="h-7 px-2 rounded-full text-xs hover:bg-destructive/10 hover:text-destructive"
      >
        <X className="h-3.5 w-3.5 mr-1" />
        Cancel (Esc)
      </Button>
    </div>
  );
}
