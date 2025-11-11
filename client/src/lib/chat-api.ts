import { apiRequest } from "./queryClient";

export interface ChatSession {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: {
    content: string;
    role: string;
    id: string;
    timestamp: string;
    sessionId: string;
  };
  sessionId: string;
}

export const chatApi = {
  async createSession(): Promise<ChatSession> {
    const response = await apiRequest("POST", "/api/chat/sessions");
    return response.json();
  },

  async getSessions(): Promise<ChatSession[]> {
    const response = await apiRequest("GET", "/api/chat/sessions");
    return response.json();
  },

  async getMessages(sessionId: string): Promise<Message[]> {
    const response = await apiRequest("GET", `/api/chat/sessions/${sessionId}/messages`);
    return response.json();
  },

  async sendMessage(sessionId: string, content: string): Promise<ChatResponse> {
    const response = await apiRequest("POST", `/api/chat/sessions/${sessionId}/messages`, {
      content,
    });
    return response.json();
  },

  async deleteSession(sessionId: string): Promise<void> {
    await apiRequest("DELETE", `/api/chat/sessions/${sessionId}`);
  },
};
