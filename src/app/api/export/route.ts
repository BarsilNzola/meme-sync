import { NextRequest, NextResponse } from 'next/server';
import { exportFinalVideo } from '@/lib/video-tools';
import { getProjectById, updateProjectExportUrl } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { projectId, format = 'mp4', quality = 'high' } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Get project from database with actual media URLs
    const project = await getProjectById(projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Use the actual URLs from the database
    const exportResult = await exportFinalVideo({
      projectId: projectId,
      format: format as 'mp4' | 'webm' | 'gif',
      quality: quality as 'low' | 'medium' | 'high',
    });

    await updateProjectExportUrl(projectId, exportResult.downloadUrl);

    return NextResponse.json({
      success: true,
      downloadUrl: exportResult.downloadUrl,
      fileSize: exportResult.fileSize,
      format: exportResult.format,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to export video' },
      { status: 500 }
    );
  }
}