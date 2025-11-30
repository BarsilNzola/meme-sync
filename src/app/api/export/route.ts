import { NextRequest, NextResponse } from 'next/server';
import { updateProjectExportUrl } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { projectId, exportUrl } = await request.json();

    console.log('Updating project export URL:', { projectId, exportUrl });

    if (!projectId || !exportUrl) {
      return NextResponse.json(
        { error: 'Project ID and export URL are required' },
        { status: 400 }
      );
    }

    // Update project and get the updated project object
    const updatedProject = await updateProjectExportUrl(projectId, exportUrl);
    
    console.log('Updated project with outputUri:', updatedProject.outputUri);

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Export URL update error:', error);
    return NextResponse.json(
      { error: 'Failed to update project export URL' },
      { status: 500 }
    );
  }
}