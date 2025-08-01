import OpenAI from 'openai';

class WhisperService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Note: In production, this should be done server-side
    });
  }

  async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      // Convert blob to file
      const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type });

      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en', // You can make this configurable
        response_format: 'text'
      });

      return transcription;
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw new Error('Failed to transcribe audio. Please try again.');
    }
  }
}

export default WhisperService;