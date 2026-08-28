import { Route as RouteIcon, Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import type { ThemeMode } from '../types';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="p-5 border-b border-border bg-card flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg">
          <RouteIcon className="text-white h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">ReRoute</h1>
          <p className="text-xs text-muted-foreground font-medium">Custom Blacklist Navigation</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleTheme}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}
