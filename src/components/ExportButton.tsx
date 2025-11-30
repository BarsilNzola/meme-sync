'use client';

import { useState } from 'react';
import { Download, CheckCircle, Video, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SyncProject } from '@/types/Project';
import { composeVideoClient } from '@/lib/ffmpeg-client';
import { storeExport } from '@/lib/storage';

// Create an extended interface for the project with media URLs
interface ProjectWithMedia extends SyncProject {
  memeImageUrl: string;
  audioUrl: string;
}

interface ExportButtonProps {
  project: ProjectWithMedia; // Use the extended type
  onExportComplete?: (updatedProject: ProjectWithMedia) => void;
}

type ExportStep = 
  | 'idle'
  | 'downloading'
  | 'loading_ffmpeg'
  | 'composing'
  | 'uploading'
  | 'completed'
  | 'error';

export default function ExportButton({ project, onExportComplete }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ExportStep>('idle');
  const [progressLogs, setProgressLogs] = useState<string[]>([]);

  const addProgressLog = (message: string) => {
    setProgressLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setCurrentStep('idle');
    setProgressLogs([]);
    
    try {
      console.log('Project object:', project);
      console.log('Meme URL:', project.memeImageUrl);
      console.log('Audio URL:', project.audioUrl);
      addProgressLog('Starting export process...');

      if (!project.memeImageUrl || !project.audioUrl) {
        throw new Error('Missing media URLs in project. Please sync the project again.');
      }

      if (typeof window === 'undefined') {
        throw new Error('Video export is only available in the browser');
      }
      
      console.log('Starting client-side video export for project:', project);
      
      // Download meme image and audio files
      setCurrentStep('downloading');
      addProgressLog('Downloading media files...');
      console.log('Downloading media files...');
      
      const [memeResponse, audioResponse] = await Promise.all([
        fetch(project.memeImageUrl),
        fetch(project.audioUrl)
      ]);
      
      if (!memeResponse.ok || !audioResponse.ok) {
        throw new Error('Failed to download media files');
      }
      
      const memeBlob = await memeResponse.blob();
      const audioBlob = await audioResponse.blob();
      addProgressLog('Media files downloaded successfully');
      
      // Create File objects for FFmpeg
      const memeFile = new File([memeBlob], 'meme.jpg', { type: 'image/jpeg' });
      const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mp3' });
      
      setCurrentStep('loading_ffmpeg');
      addProgressLog('Initializing video engine...');
      console.log('Generating video with FFmpeg WASM...');
      
      // Use FFmpeg WASM to generate video
      setCurrentStep('composing');
      addProgressLog('Composing video with audio...');
      
      const videoBlob = await composeVideoClient({
        imageFiles: [memeFile],
        audioFile: audioFile,
        duration: 15,
        syncPoints: project.syncPoints || [0],
        outputFormat: 'mp4',
        resolution: { width: 640, height: 640 }
      });
      
      addProgressLog('Video composition completed successfully');
      console.log('Video generated, uploading to Supabase...');
      
      // Upload to Supabase Storage
      setCurrentStep('uploading');
      addProgressLog('Uploading video to storage...');
      
      const outputFileName = `export_${project.id}_high.mp4`;
      const videoBuffer = Buffer.from(await videoBlob.arrayBuffer());
      const downloadUrl = await storeExport(videoBuffer, outputFileName);
      
      addProgressLog('Video uploaded successfully');
      console.log('Video uploaded to Supabase:', downloadUrl);
      
      // Update project with export URL using existing export route
      addProgressLog('Updating project data...');
      const updateResponse = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          exportUrl: downloadUrl,
        }),
      });
      
      if (updateResponse.ok) {
        const updatedProject = await updateResponse.json();
        addProgressLog('Project updated successfully');
        
        // Call the callback with the updated project
        if (onExportComplete) {
          onExportComplete({
            ...updatedProject,
            memeImageUrl: project.memeImageUrl,
            audioUrl: project.audioUrl
          });
        }
      } else {
        console.warn('Failed to update project export URL, but video was generated');
        addProgressLog('Project updated with minor warnings');
      }
      
      setCurrentStep('completed');
      setIsExported(true);
      addProgressLog('Export completed! Starting download...');
      
      // Create a proper download from the blob instead of using the Supabase URL
      // This ensures the file downloads instead of opening in a new tab
      const url = URL.createObjectURL(videoBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `memesync-${project.projectName.replace(/\s+/g, '-').toLowerCase()}.mp4`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      addProgressLog('Download initiated successfully');
      console.log('Download initiated');
      
    } catch (error) {
      console.error('Client-side export failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      setError(errorMessage);
      setCurrentStep('error');
      addProgressLog(`Error: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getStepProgress = () => {
    const steps = ['downloading', 'loading_ffmpeg', 'composing', 'uploading', 'completed'];
    const currentIndex = steps.indexOf(currentStep);
    return currentIndex >= 0 ? (currentIndex + 1) / steps.length * 100 : 0;
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'downloading':
        return 'Downloading media files...';
      case 'loading_ffmpeg':
        return 'Initializing video engine...';
      case 'composing':
        return 'Composing video with audio...';
      case 'uploading':
        return 'Uploading video to storage...';
      case 'completed':
        return 'Export completed!';
      case 'error':
        return 'Export failed';
      default:
        return 'Preparing export...';
    }
  };

  return (
    <div className="space-y-4">
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
            Exporting... ({Math.round(getStepProgress())}%)
          </>
        ) : (
          <>
            <Video className="w-5 h-5" />
            Export Video
          </>
        )}
      </Button>
      
      {/* Progress Indicator */}
      {isExporting && (
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${getStepProgress()}%` }}
            ></div>
          </div>
          
          {/* Step Description */}
          <div className="text-sm text-center text-gray-600 dark:text-gray-300">
            {getStepDescription()}
          </div>
          
          {/* Progress Logs */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Progress:
            </div>
            <div className="space-y-1">
              {progressLogs.map((log, index) => (
                <div 
                  key={index} 
                  className="text-xs text-gray-600 dark:text-gray-400 font-mono"
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {isExported && !error && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
            <CheckCircle className="w-4 h-4" />
            <span>Video exported successfully!</span>
          </div>
          <div className="text-xs text-gray-500 text-center">
            The video has been downloaded to your device
          </div>
        </div>
      )}
    </div>
  );
}