export interface SyncProject {
  id: number; 
  projectName: string; 
  memeId: number; 
  audioId: number; 
  creator: string; 
  syncPoints: number[]; 
  outputUri: string; 
  ipAssetHash: string; 
  status: ProjectStatus;
  createdAt: number; 
  updatedAt: number;
}

export enum ProjectStatus {
  Draft = 'Draft',
  Synced = 'Synced', 
  Exported = 'Exported',
  Registered = 'Registered',
  Archived = 'Archived'
}

export interface SyncData {
  memeStartTime: number;
  audioStartTime: number;
  duration: number;
  beatMatches: BeatMatch[];
}

export interface BeatMatch {
  memeFrame: number;
  audioBeat: number;
  timestamp: number;
  strength: number;
}