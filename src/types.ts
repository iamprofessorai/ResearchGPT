export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  attachments?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    mimeType: string;
  }[];
  groundingMetadata?: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  personaId?: string;
  lastMessageAt: string;
  createdAt: string;
  deleted?: boolean;
}

export interface Persona {
  id: string;
  userId: string;
  name: string;
  systemInstruction: string;
  isPublic: boolean;
  createdAt: string;
}

export interface KnowledgeBase {
  id: string;
  userId: string;
  name: string;
  urls: string[];
  description: string;
  createdAt: string;
}

export interface MCPConfig {
  id: string;
  userId: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  type: 'local' | 'remote';
  createdAt: string;
}
