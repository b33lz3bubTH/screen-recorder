// API service for backend communication
const API_BASE_URL = '/api';

export interface RecordingSession {
  session_key: string;
  message: string;
}

export interface SessionStatus {
  session_key: string;
  is_recording: boolean;
  start_time: string;
  status: string;
}

export class ApiService {
  static async startRecording(): Promise<RecordingSession> {
    const response = await fetch(`${API_BASE_URL}/start-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to start recording: ${response.statusText}`);
    }

    return response.json();
  }

  static async uploadChunk(sessionKey: string, source: 'screen' | 'webcam', chunk: Blob): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/upload-chunk/${sessionKey}/${source}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: chunk,
    });
    if (!res.ok) {
      throw new Error('Failed to upload chunk');
    }
  }

  static async stopRecording(sessionKey: string): Promise<{ message: string; session_key: string }> {
    const response = await fetch(`${API_BASE_URL}/stop-recording`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_key: sessionKey }),
    });

    if (!response.ok) {
      throw new Error(`Failed to stop recording: ${response.statusText}`);
    }

    return response.json();
  }

  static async getSessionStatus(sessionKey: string): Promise<SessionStatus> {
    const response = await fetch(`${API_BASE_URL}/session/${sessionKey}/status`);

    if (!response.ok) {
      throw new Error(`Failed to get session status: ${response.statusText}`);
    }

    return response.json();
  }

  static getDownloadUrl(sessionKey: string): string {
    return `${API_BASE_URL}/download/${sessionKey}`;
  }

  static async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }
}
