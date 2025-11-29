'use client';

import { useState } from 'react';
import { Download, CheckCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SyncProject } from '@/types/Project';

interface ExportButtonProps {
  project: SyncProject;
}

export default function ExportButton({ project }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isExported, setIsExported] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          format: 'mp4',
          quality: 'high',
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIsExported(true);
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `meme-sync-${project.id}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting || isExported}
      size="lg"
      className={`gap-2 ${
        isExported
          ? 'bg-green-600 hover:bg-green-700'
          : isExporting
          ? 'bg-blue-600 hover:bg-blue-700'
          : 'bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700'
      }`}
    >
      {isExported ? (
        <>
          <CheckCircle className="w-5 h-5" />
          Exported Successfully
        </>
      ) : isExporting ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Exporting...
        </>
      ) : (
        <>
          <Video className="w-5 h-5" />
          Export Video
        </>
      )}
    </Button>
  );
}