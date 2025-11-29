export interface ExportResult {
  success: boolean;
  downloadUrl: string;
  fileSize: number;
  format: string;
  quality: string;
}

export interface ExportRequest {
  projectId: string; // Note: this should be string to match video-tools
  format?: string;
  quality?: string;
}