/**
 * Gemini API Client
 * Handles API communication, authentication, and rate limiting
 */

import { RATE_LIMIT } from '../types';

// ============================================================================
// GEMINI API CLIENT
// ============================================================================

export class GeminiClient {
  private apiKey: string | null = null;
  private readonly geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
  private readonly geminiModel = 'gemini-2.5-flash';
  private requestQueue: Map<string, number[]> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.autoInitialize();
    }
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private autoInitialize(): void {
    const envGeminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    if (envGeminiKey) {
      this.initialize(envGeminiKey);
      return;
    }
    
    const savedKey = localStorage.getItem('ai_api_key');
    if (savedKey) {
      this.initialize(savedKey);
    }
  }

  public initialize(apiKey: string): void {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('API key cannot be empty');
    }
    this.apiKey = apiKey;
  }

  public isInitialized(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  private async rateLimit(key: string = 'default'): Promise<void> {
    const now = Date.now();
    const requests = this.requestQueue.get(key) || [];
    
    const recentRequests = requests.filter(
      timestamp => now - timestamp < RATE_LIMIT.BURST_WINDOW_MS
    );
    
    if (recentRequests.length >= RATE_LIMIT.BURST_LIMIT) {
      const oldestRequest = recentRequests[0];
      const waitTime = RATE_LIMIT.BURST_WINDOW_MS - (now - oldestRequest);
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.rateLimit(key);
      }
    }
    
    if (recentRequests.length > 0) {
      const lastRequest = recentRequests[recentRequests.length - 1];
      const timeSinceLastRequest = now - lastRequest;
      
      if (timeSinceLastRequest < RATE_LIMIT.DEFAULT_MS) {
        const waitTime = RATE_LIMIT.DEFAULT_MS - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    recentRequests.push(Date.now());
    this.requestQueue.set(key, recentRequests);
  }

  // ============================================================================
  // API COMMUNICATION
  // ============================================================================

  private async callGemini(prompt: string, maxTokens: number, temperature: number): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key not initialized');
    }

    const url = `${this.geminiUrl}${this.geminiModel}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature
        }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Gemini API error:', error);
      throw new Error(error.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${data.promptFeedback.blockReason}. Try rephrasing.`);
    }
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No content returned. May be due to safety filters or rate limiting.');
    }
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text || text.trim() === '') {
      throw new Error('Empty content returned. Please try again.');
    }
    
    return text;
  }

  public async makeRequest(
    prompt: string, 
    maxTokens: number, 
    temperature: number
  ): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error('AI service not initialized. Please set your API key in settings.');
    }

    await this.rateLimit();

    try {
      return await this.callGemini(prompt, maxTokens, temperature);
    } catch (error) {
      console.error('AI request error:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isInitialized()) {
      return { success: false, message: 'API key not set' };
    }

    try {
      await this.makeRequest('Hello', 10, 0.5);
      return { success: true, message: 'Connection successful!' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      return { success: false, message: errorMessage };
    }
  }
}

