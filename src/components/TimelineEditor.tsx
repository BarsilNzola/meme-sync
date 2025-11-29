'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SyncProject } from '@/types/Project';

interface TimelineEditorProps {
  project: SyncProject;
  duration: number;
}

export default function TimelineEditor({ project, duration }: TimelineEditorProps) {
  // Provide fallback empty array if syncPoints is undefined
  const [syncPoints, setSyncPoints] = useState<number[]>(project.syncPoints || []);

  const addSyncPoint = (time: number) => {
    const newPoints = [...syncPoints, time].sort((a, b) => a - b);
    setSyncPoints(newPoints);
  };

  const removeSyncPoint = (index: number) => {
    const newPoints = syncPoints.filter((_, i) => i !== index);
    setSyncPoints(newPoints);
  };

  const updateSyncPoint = (index: number, newTime: number) => {
    const newPoints = [...syncPoints];
    newPoints[index] = Math.max(0, Math.min(duration, newTime));
    newPoints.sort((a, b) => a - b);
    setSyncPoints(newPoints);
  };

  const addSyncPointAtCurrent = () => {
    const newTime = Math.floor(Math.random() * duration * 10) / 10;
    addSyncPoint(newTime);
  };

  // Calculate progress value for the progress bar
  const progressValue = Math.min(100, (syncPoints.length / 8) * 100);

  return (
    <Card className="bg-background/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-foreground">Timeline Editor</CardTitle>
        <CardDescription className="text-muted-foreground">
          Adjust the timing sync points between your meme and audio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline Visualization */}
        <div className="relative h-24 bg-muted rounded-lg overflow-hidden border border-border">
          {/* Time markers */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-r border-border relative"
              >
                <div className="absolute top-1 left-1 text-xs text-muted-foreground">
                  {i}s
                </div>
              </div>
            ))}
          </div>

          {/* Sync points */}
          {syncPoints.map((time, index) => (
            <div
              key={index}
              className="absolute top-0 bottom-0 w-2 flex flex-col items-center cursor-move group"
              style={{ left: `${(time / duration) * 100}%` }}
            >
              <div className="w-4 h-4 bg-primary rounded-full transform -translate-y-2 shadow-lg group-hover:scale-125 transition-transform" />
              <div className="mt-6 text-xs text-primary font-medium bg-background px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity border border-border">
                {time.toFixed(2)}s
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSyncPoint(index)}
                  className="ml-1 w-4 h-4 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add point area */}
          <div 
            className="absolute inset-0 cursor-crosshair"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const time = (clickX / rect.width) * duration;
              addSyncPoint(time);
            }}
          />
        </div>

        {/* Sync Points Management */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Sync Points</h3>
            <Button onClick={addSyncPointAtCurrent} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Point
            </Button>
          </div>
          
          <div className="max-h-48 overflow-y-auto space-y-2">
            {syncPoints.map((time, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg border border-border">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={time.toFixed(2)}
                  onChange={(e) => updateSyncPoint(index, parseFloat(e.target.value))}
                  step="0.1"
                  min="0"
                  max={duration}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSyncPoint(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            
            {syncPoints.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No sync points yet. Click on the timeline or "Add Point" to create sync points.
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <Card className="bg-background/30 border-border">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{syncPoints.length}</div>
              <div className="text-xs text-muted-foreground">Sync Points</div>
            </CardContent>
          </Card>
          <Card className="bg-background/30 border-border">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">
                {duration > 0 ? (syncPoints.length / duration).toFixed(1) : '0.0'}
              </div>
              <div className="text-xs text-muted-foreground">Points/Second</div>
            </CardContent>
          </Card>
          <Card className="bg-background/30 border-border">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{duration.toFixed(1)}s</div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Quality Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Sync Quality</span>
            <Badge variant={syncPoints.length > 3 ? "default" : "secondary"}>
              {syncPoints.length > 3 ? "Good" : "Needs More Points"}
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}