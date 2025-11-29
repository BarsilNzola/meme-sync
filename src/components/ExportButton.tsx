'use client';

import { useState } from 'react';
import { Download, CheckCircle, Video, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SyncProject } from '@/types/Project';

interface ExportButtonProps {
  project: SyncProject;
}

export default function ExportButton({ project }: ExportController) {
  const [isExporting, setIsExporting] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    
    try {
      console.log('Exporting project:', project);
      
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
      
      console.log('Export response status:', response.status);
      
      const result = await response.json();
      console.log('Export response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || `Export failed with status: ${response.status}`);
      }
      
      if (result.success) {
        setIsExported(true);
        
        // Extract the actual filename from the download URL
        const downloadUrl = result.downloadUrl;
        const actualFilename = downloadUrl.split('/').pop();
        
        // Use the actual filename for download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = actualFilename || `meme-sync-${project.id}.${result.format}`;
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Download initiated for:', downloadUrl, 'with filename:', actualFilename);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setError(error instanceof Error ? error.message : 'Export failed');
      setIsExported(false);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleExport}
        disabled={isExporting || isExported}
        size="lg"
        className={`gap-2 w-full ${
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
            Export Completed
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
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {isExported && !error && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
          <CheckCircle className="w-4 h-4" />
          <span>Video exported successfully! Check your downloads folder.</span>
        </div>
      )}
    </div>
  );
}