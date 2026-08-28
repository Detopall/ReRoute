import { useState, useRef, useEffect } from 'react';
import { RouteOff, SquareDashed, Search, Loader2, X, ShieldAlert, Download, Upload, Undo2, Redo2, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useGeocode } from '../hooks/useGeocode';
import type { BlacklistItem, NominatimResult } from '../types';

interface BlacklistPanelProps {
  items: BlacklistItem[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
  onBlacklistRoad: () => void;
  onBlacklistArea: () => void;
  onHover: (id: string | null) => void;
  onSearchNavigation?: (result: NominatimResult) => void;
  onImport?: (items: BlacklistItem[]) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  selectedId?: string | null;
  onSelectId?: (id: string | null) => void;
  activeMode: string;
}

export function BlacklistPanel({
  items,
  onRemove,
  onClearAll,
  onBlacklistRoad,
  onBlacklistArea,
  onHover,
  onSearchNavigation,
  onImport,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  selectedId,
  onSelectId,
  activeMode,
}: BlacklistPanelProps) {
  const { suggestions, loading, search, clear } = useGeocode();
  const [searchValue, setSearchValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setSearchValue(val);
    search(val);
    setShowSuggestions(true);
  }

  function handleSelect(result: NominatimResult) {
    if (onSearchNavigation) onSearchNavigation(result);
    setSearchValue('');
    setShowSuggestions(false);
    clear();
  }

  function handleExport() {
    const data = JSON.stringify(items, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reroute-blacklists-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed) && onImport) {
          const validated = parsed.filter(
            (item: any) => item.id && item.type && item.geometry && item.label
          ).map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt || Date.now()),
          }));
          onImport(validated);
        }
      } catch {}
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <Card className="bg-background/50 backdrop-blur-md border-border/50 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/30 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between text-foreground">
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-500" />
            Blacklist Tools
          </span>
          <span className="flex items-center gap-0.5">
            {onUndo && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onRedo && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleImportClick}
              title="Import blacklists from file"
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleExport}
              disabled={items.length === 0}
              title="Export blacklists to file"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            {onClearAll && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={onClearAll}
                disabled={items.length === 0}
                title="Clear all blacklists (localStorage)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4">
        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={activeMode === 'blacklist-road' ? 'default' : 'outline'}
            className="w-full h-9 text-xs"
            onClick={onBlacklistRoad}
            title="Click a road on the map to blacklist it"
          >
            <RouteOff className="mr-2 h-3.5 w-3.5" />
            Road
          </Button>
          <Button
            variant={activeMode === 'blacklist-area' ? 'default' : 'outline'}
            className="w-full h-9 text-xs"
            onClick={onBlacklistArea}
            title="Draw a polygon on the map to blacklist an area"
          >
            <SquareDashed className="mr-2 h-3.5 w-3.5" />
            Area
          </Button>
        </div>

        {/* Search */}
        <div className="relative" ref={wrapperRef}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search location..."
              value={searchValue}
              onChange={handleInputChange}
              onFocus={() => { if (searchValue) setShowSuggestions(true); }}
              className="pl-8 h-9 text-xs bg-background/50"
            />
          </div>
          {showSuggestions && (suggestions.length > 0 || loading) && (
            <ul className="absolute top-full left-0 right-0 mt-1 py-1 bg-popover text-popover-foreground rounded-md shadow-md border border-border z-50 max-h-48 overflow-y-auto">
              {loading && (
                <li className="flex items-center justify-center p-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Searching...
                </li>
              )}
              {!loading && suggestions.map((s) => (
                <li
                  key={s.place_id}
                  className="px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer flex flex-col"
                  onClick={() => handleSelect(s)}
                >
                  <span className="font-medium truncate">{s.display_name.split(',')[0]}</span>
                  <span className="text-[10px] text-muted-foreground truncate opacity-80">
                    {s.display_name.split(',').slice(1).join(',')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* List */}
        <div className="pt-2 border-t border-border/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Blacklisted Items
            </h3>
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              {items.length}
            </Badge>
          </div>

          <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground/60 flex flex-col items-center gap-2">
                <RouteOff className="h-8 w-8 opacity-20" />
                <p className="text-xs">No active blacklists.</p>
              </div>
            ) : (
              Object.entries(
                items.reduce((acc, item) => {
                  const region = item.region || 'Unknown Region';
                  if (!acc[region]) acc[region] = [];
                  acc[region].push(item);
                  return acc;
                }, {} as Record<string, typeof items>)
              ).sort(([regionA], [regionB]) => regionA.localeCompare(regionB))
              .map(([region, regionItems]) => (
                <div key={region} className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest pl-1">
                    {region}
                  </h4>
                  {regionItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-2 rounded-md transition-colors group cursor-pointer border ${
                        selectedId === item.id
                          ? 'bg-orange-500/20 border-orange-500/60'
                          : 'bg-secondary/30 border-border/50 hover:bg-secondary/60 hover:border-orange-500/30'
                      }`}
                      onClick={() => onSelectId?.(selectedId === item.id ? null : item.id)}
                      onMouseEnter={() => onHover(item.id)}
                      onMouseLeave={() => onHover(null)}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-base shrink-0 opacity-80">
                          {item.type === 'road' ? '🛣️' : '🔲'}
                        </span>
                        <span className="text-xs truncate font-medium">{item.label}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemove(item.id);
                        }}
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
