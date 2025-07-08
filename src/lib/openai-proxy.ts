/**
 * OpenAI Proxy Client - Secure API calls through local proxy server
 * This replaces direct OpenAI client calls to hide API keys from browser
 */

export class OpenAIProxyClient {
  private baseUrl = '/api/openai';

  /**
   * Create chat completion via proxy server
   */
  async createChatCompletion(params: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
  }) {
    const response = await fetch(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Translation API error: ${error.error || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Create Whisper transcription via proxy server
   */
  async createTranscription(audioFile: File, params?: {
    language?: string;
    prompt?: string;
  }) {
    const formData = new FormData();
    formData.append('file', audioFile);
    
    if (params?.language) {
      formData.append('language', params.language);
    }
    if (params?.prompt) {
      formData.append('prompt', params.prompt);
    }

    const response = await fetch(`${this.baseUrl}/whisper`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Whisper API error: ${error.error || 'Unknown error'}`);
    }

    return response.json();
  }

  /**
   * Create text-to-speech via proxy server
   */
  async createSpeech(params: {
    model: string;
    input: string;
    voice: string;
    response_format?: string;
    speed?: number;
  }) {
    const response = await fetch(`${this.baseUrl}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`TTS API error: ${error.error || 'Unknown error'}`);
    }

    // Return the audio response as ArrayBuffer
    return response.arrayBuffer();
  }
}

// Singleton instance
export const openAIProxyClient = new OpenAIProxyClient();

/**
 * Get proxy client with network-adaptive timeout handling
 * This maintains compatibility with the existing network quality system
 */
export function getOpenAIProxyClient(): OpenAIProxyClient {
  return openAIProxyClient;
}