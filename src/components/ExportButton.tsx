'use client';

import { useState } from 'react';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SyncProject } from '@/types/Project';

// This should match your ProjectWithMedia from page.tsx
interface ExportButtonProject extends SyncProject {
  memeImageUrl: string;  // Make these required
  audioUrl: string;
  videoUrl?: string;
}

interface ExportButtonProps {
  project: ExportButtonProject;
  onExportComplete?: (updatedProject: ExportButtonProject) => void;
}

export default function ExportButton({ project, onExportComplete }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Use videoUrl if available, otherwise fallback to outputUri
  const videoUrl = project.videoUrl || project.outputUri;

  const handleExport = async () => {
    if (!videoUrl) {
      setError('No video available to export. Video is still generating...');
      toast({
        title: 'Video Not Ready',
        description: 'Please wait for video generation to complete.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsExporting(true);
    setError(null);
    
    try {
      // Download the video
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error('Failed to download video');
      
      const videoBlob = await response.blob();
      const url = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Use projectName for filename, fallback to ID
      const projectName = project.projectName || `project-${project.id}`;
      link.download = `memesync-${projectName.replace(/\s+/g, '-').toLowerCase()}.mp4`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      setIsExported(true);
      
      toast({
        title: 'Download Started',
        description: 'Your video is downloading to your device.',
      });
      
      // Callback if needed
      if (onExportComplete) {
        onExportComplete(project);
      }
      
    } catch (error: any) {
      console.error('Export failed:', error);
      const errorMsg = error.message || 'Failed to export video';
      setError(errorMsg);
      toast({
        title: 'Export Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleExport}
        disabled={isExporting || isExported || !videoUrl}
        size="lg"
        className={`gap-2 w-full ${
          isExported
            ? 'bg-green-600 hover:bg-green-700'
            : isExporting
            ? 'bg-blue-600 hover:bg-blue-700'
            : videoUrl
            ? 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'
            : 'bg-gray-600 cursor-not-allowed'
        }`}
      >
        {isExported ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Download Completed
          </>
        ) : isExporting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            {videoUrl ? 'Download Video' : 'Video Generating...'}
          </>
        )}
      </Button>
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}