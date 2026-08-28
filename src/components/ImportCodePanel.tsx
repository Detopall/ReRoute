import { useState } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Link as LinkIcon, ArrowRight } from 'lucide-react';

interface ImportCodePanelProps {
  onLoadCode: (code: string) => void;
}

export function ImportCodePanel({ onLoadCode }: ImportCodePanelProps) {
  const [inputCode, setInputCode] = useState('');

  const handleSubmit = () => {
    if (!inputCode.trim()) return;
    onLoadCode(inputCode.trim());
    setInputCode('');
  };

  return (
    <Card className="bg-background/50 backdrop-blur-md border-border/50 shadow-sm p-3.5 space-y-2">
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-cyan-500" />
        <h3 className="text-xs font-semibold text-foreground">Import Route Code</h3>
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Paste route code or link..."
          value={inputCode}
          onChange={(e) => setInputCode(e.target.value)}
          className="h-8 text-xs bg-background/50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
          }}
        />
        <Button
          size="sm"
          className="h-8 px-3 text-xs bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
          onClick={handleSubmit}
          disabled={!inputCode.trim()}
          title="Load route and markers"
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
