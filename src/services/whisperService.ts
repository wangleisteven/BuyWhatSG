import OpenAI from 'openai';

class WhisperService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, this should be done server-side
      defaultHeaders: {
        'User-Agent': 'BuyWhatSG/1.0'
      }
    });
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      // Check file size (25 MB limit)
      const maxSize = 25 * 1024 * 1024; // 25 MB in bytes
      if (audioBlob.size > maxSize) {
        throw new Error('Audio file is too large. Maximum size is 25 MB.');
      }

      // Convert blob to file with correct type
      const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type || 'audio/webm' });

      let transcription;
      try {
        // Try the newer, higher-quality model first
        transcription = await this.openai.audio.transcriptions.create({
          file: audioFile,
          model: 'gpt-4o-mini-transcribe',
          response_format: 'json'
        });
      } catch (modelError) {
        console.warn('Newer model failed, falling back to whisper-1:', modelError);
        // Fallback to the older model
        transcription = await this.openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          response_format: 'json'
        });
      }

      // Extract text from the response object
      return transcription.text;
    } catch (error) {
      console.error('Whisper transcription error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        // Check for rate limit errors (429)
        if (error.message.includes('429') || error.message.toLowerCase().includes('rate limit')) {
          throw new Error('System busy, please try again later');
        }
        
        // Check for quota exceeded errors
        if (error.message.toLowerCase().includes('quota') || error.message.toLowerCase().includes('billing')) {
          throw new Error('System busy, please try again later');
        }
        
        throw new Error(`Failed to transcribe audio: ${error.message}`);
      }
      
      throw new Error('Failed to transcribe audio. Please try again.');
    }
  }
}

export default WhisperService;