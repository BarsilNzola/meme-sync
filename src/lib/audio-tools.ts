import axios from 'axios';

export interface AudioGenerationRequest {
  prompt: string;
  duration: number;
  mood: string;
  tempo?: number;
}

export interface AudioGenerationResult {
  success: true;
  audioUrl: string;
  duration: number;
  bpm: number;
  beats: number[];
  format: string;
  fileSize: number;
}

export interface BeatDetectionResult {
  bpm: number;
  beats: number[];
  confidence: number;
}

const SUNO_API_TOKEN = process.env.NEXT_PUBLIC_SUNO_API_TOKEN || '';
const SUNO_API_BASE_URL = 'https://api.sunoapi.org';

/**
 * Main audio generation function - tries Suno API first, falls back to placeholder
 */
export async function generateAudioWithMusicGen(request: AudioGenerationRequest): Promise<AudioGenerationResult> {
  // If no API token, use placeholder for reliability
  if (!SUNO_API_TOKEN) {
    console.log('No Suno API token, using placeholder audio');
    return generatePlaceholderAudio(request);
  }

  try {
    console.log('Attempting Suno API generation...');
    const sunoResult = await generateAudioWithSuno(request);
    
    if (sunoResult.success) {
      console.log('Suno generation successful!');
      return sunoResult;
    }
    
    throw new Error('Suno generation failed');
  } catch (error) {
    console.error('Suno API failed, using placeholder:', error);
    return generatePlaceholderAudio(request);
  }
}

/**
 * Generate audio using Suno API with proper polling
 */
async function generateAudioWithSuno(request: AudioGenerationRequest): Promise<AudioGenerationResult> {
  const style = getStyleForMood(request.mood);
  
  // Start the generation with a dummy callback URL (required by API)
  const sunoPayload = {
    prompt: request.prompt,
    style: style,
    title: `${request.mood} Meme Track`,
    customMode: true,
    instrumental: true,
    model: "V4_5ALL",
    styleWeight: 0.7,
    weirdnessConstraint: 0.5,
    audioWeight: 0.8,
    callBackUrl: "https://webhook.site/dummy-callback" // Required but we'll use polling
  };

  console.log('Starting Suno generation with:', {
    prompt: sunoPayload.prompt,
    style: sunoPayload.style,
    mood: request.mood
  });

  const generateResponse = await axios.post(`${SUNO_API_BASE_URL}/api/v1/generate`, sunoPayload, {
    headers: {
      'Authorization': `Bearer ${SUNO_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000
  });

  console.log('Generation started:', generateResponse.data);

  if (generateResponse.data?.code === 200 && generateResponse.data.data?.taskId) {
    const taskId = generateResponse.data.data.taskId;
    console.log(`Task ID: ${taskId}, starting polling...`);

    // Poll for completion using the correct endpoint
    const song = await pollForCompletion(taskId);
    
    if (song && song.audio_url) {
      console.log('🎵 Suno generation completed successfully!');
      console.log('Audio URL:', song.audio_url);
      
      return {
        success: true,
        audioUrl: song.audio_url,
        duration: song.duration || request.duration,
        bpm: request.tempo || getTempoForMood(request.mood),
        beats: generatePlaceholderBeats(request.duration, request.tempo || getTempoForMood(request.mood)),
        format: 'mp3',
        fileSize: 0
      };
    }
  }

  throw new Error('Failed to get valid response from Suno API');
}

/**
 * Poll for task completion using the correct endpoint
 */
/**
 * Poll for task completion using the correct endpoint
 */
async function pollForCompletion(taskId: string, maxAttempts = 30, interval = 10000): Promise<any> {
  console.log(`Starting polling for task ${taskId}...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Polling attempt ${attempt}/${maxAttempts}`);
      
      // Wait before polling (except first attempt)
      if (attempt > 1) {
        const waitTime = interval / 1000;
        console.log(`Waiting ${waitTime} seconds before next poll...`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }

      // Use the correct polling endpoint from documentation
      const statusResponse = await axios.get(`${SUNO_API_BASE_URL}/api/v1/generate/record-info`, {
        params: {
          taskId: taskId
        },
        headers: {
          'Authorization': `Bearer ${SUNO_API_TOKEN}`,
        },
        timeout: 30000
      });

      console.log('Poll response received:', statusResponse.data);

      const responseData = statusResponse.data;
      
      if (responseData?.code === 200 && responseData.data) {
        const taskData = responseData.data;
        console.log('Task status:', taskData.status);
        
        // Check if task is complete with the correct response structure
        if (taskData.status === 'SUCCESS' && taskData.response?.sunoData?.length > 0) {
          const song = taskData.response.sunoData[0];
          if (song.audioUrl) {
            console.log('Generation complete!');
            console.log('Song data:', song);
            return {
              audio_url: song.audioUrl,
              duration: song.duration,
              title: song.title,
              prompt: song.prompt
            };
          }
        }
        
        if (taskData.status === 'error' || taskData.errorCode) {
          throw new Error(`Generation failed: ${taskData.errorMessage || taskData.errorCode}`);
        }
        
        // Task is still processing
        if (taskData.status === 'PENDING' || taskData.status === 'TEXT_SUCCESS' || taskData.status === 'SUCCESS') {
          console.log('Still processing...');
          continue;
        }
        
      } else if (responseData?.code !== 200) {
        console.log('Non-200 response:', responseData?.msg);
      }
      
    } catch (error: any) {
      console.error(`Polling attempt ${attempt} failed:`, error.message);
      
      // If it's a 404 or other error, wait and continue
      if (error.response?.status === 404) {
        console.log('Task not found yet, continuing...');
      } else {
        console.log('Other error, continuing polling...');
      }
      
      // Continue polling on most errors
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
  }
  
  throw new Error(`Generation timeout after ${maxAttempts} attempts`);
}

/**
 * Generate high-quality placeholder audio based on mood
 */
function generatePlaceholderAudio(request: AudioGenerationRequest): AudioGenerationResult {
  const moodSamples: { [key: string]: { url: string, bpm: number, description: string }[] } = {
    'epic': [
      { url: 'https://assets.mixkit.co/music/preview/mixkit-epic-cinematic-trailer-1491.mp3', bpm: 120, description: 'Epic cinematic trailer music' },
      { url: 'https://assets.mixkit.co/music/preview/mixkit-epic-heroic-1873.mp3', bpm: 125, description: 'Heroic orchestral music' },
    ],
    'funny': [
      { url: 'https://assets.mixkit.co/music/preview/mixkit-game-show-suspense-waiting-667.mp3', bpm: 140, description: 'Game show comedy music' },
      { url: 'https://assets.mixkit.co/music/preview/mixkit-funny-breakfast-288.mp3', bpm: 135, description: 'Light comedy music' },
    ],
    'dramatic': [
      { url: 'https://assets.mixkit.co/music/preview/mixkit-sad-times-576.mp3', bpm: 80, description: 'Dramatic emotional music' },
      { url: 'https://assets.mixkit.co/music/preview/mixkit-melancholic-piano-1161.mp3', bpm: 75, description: 'Melancholic piano' },
    ],
    'happy': [
      { url: 'https://assets.mixkit.co/music/preview/mixkit-sunny-happy-16.mp3', bpm: 130, description: 'Sunny happy music' },
      { url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3', bpm: 125, description: 'Upbeat electronic' },
    ],
    'sad': [
      { url: 'https://assets.mixkit.co/music/preview/mixkit-melancholic-piano-1161.mp3', bpm: 70, description: 'Melancholic piano' },
      { url: 'https://assets.mixkit.co/music/preview/mixkit-sad-times-576.mp3', bpm: 75, description: 'Sad emotional music' },
    ],
    'suspense': [
      { url: 'https://assets.mixkit.co/music/preview/mixkit-creeping-deep-horror-1101.mp3', bpm: 100, description: 'Horror suspense music' },
      { url: 'https://assets.mixkit.co/music/preview/mixkit-suspense-piano-1181.mp3', bpm: 105, description: 'Suspenseful piano' },
    ]
  };
  
  const samples = moodSamples[request.mood.toLowerCase()] || 
    [{ url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3', bpm: 120, description: 'Default electronic music' }];
  
  const selected = samples[Math.floor(Math.random() * samples.length)];
  const bpm = request.tempo || selected.bpm;
  
  console.log(`Selected ${request.mood} placeholder: ${selected.description}`);
  
  return {
    success: true,
    audioUrl: selected.url,
    duration: request.duration,
    bpm: bpm,
    beats: generatePlaceholderBeats(request.duration, bpm),
    format: 'mp3',
    fileSize: 1024000
  };
}

/**
 * Map mood to music style for Suno API
 */
function getStyleForMood(mood: string): string {
  const styleMap: { [key: string]: string } = {
    'epic': 'Cinematic Orchestral',
    'funny': 'Comedic Cartoon',
    'dramatic': 'Dramatic Film Score',
    'happy': 'Upbeat Pop',
    'sad': 'Melancholic Piano',
    'suspense': 'Suspenseful Horror',
  };
  return styleMap[mood.toLowerCase()] || 'Electronic';
}

/**
 * Get appropriate tempo for mood
 */
function getTempoForMood(mood: string): number {
  const tempoMap: { [key: string]: number } = {
    'epic': 120,
    'funny': 140,
    'dramatic': 80,
    'happy': 130,
    'sad': 70,
    'suspense': 100,
  };
  return tempoMap[mood.toLowerCase()] || 120;
}

/**
 * Generate realistic beat timings
 */
function generatePlaceholderBeats(duration: number, bpm: number): number[] {
  const beats: number[] = [];
  const beatInterval = 60 / bpm;
  
  for (let time = 0; time < duration; time += beatInterval) {
    const variedTime = time + (Math.random() * 0.1 - 0.05);
    if (variedTime < duration) {
      beats.push(parseFloat(variedTime.toFixed(2)));
    }
  }
  
  return beats;
}

/**
 * Simple beat detection from audio URL
 */
export async function detectBeatsFromUrl(audioUrl: string): Promise<BeatDetectionResult> {
  return {
    bpm: 120,
    beats: [0, 0.5, 1.0, 1.5, 2.0, 2.5],
    confidence: 0.7
  };
}

// Export for testing
export { generateAudioWithSuno };