import { NextRequest, NextResponse } from 'next/server';
import { exportFinalVideo } from '@/lib/video-tools';
import { getProjectById, updateProjectExportUrl } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { projectId, format = 'mp4', quality = 'high' } = await request.json();

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Pass the actual meme and audio URLs from the project
    const exportResult = await exportFinalVideo({
      projectId: projectId,
      format: format as 'mp4' | 'webm' | 'gif',
      quality: quality as 'low' | 'medium' | 'high',
      memeUrl: project.memeImageUrl, // From database
      audioUrl: project.audioUrl,    // From database
      duration: 15, // You might want to get this from sync data
    });

    // Update project with export URL in database
    await updateProjectExportUrl(projectId, exportResult.downloadUrl);

    return NextResponse.json({
      success: true,
      downloadUrl: exportResult.downloadUrl,
      fileSize: exportResult.fileSize,
      format: exportResult.format,
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export video' }, { status: 500 });
  }
}