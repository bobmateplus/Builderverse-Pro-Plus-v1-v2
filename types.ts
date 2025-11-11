

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  base64: string;
}

export interface ChatMessage { // UI-specific ChatMessage
  id: string | number;
  role: 'user' | 'model' | 'system';
  text: string;
  status?: 'typing';
  inlineData?: { // Added for multi-modal UI message representation
    mimeType: string;
    data: string;
  };
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface FormattedSource {
  type: 'web' | 'map';
  uri: string;
  title: string;
  reviewSnippets?: Array<{ uri: string; title: string; }>;
}

export interface EstimateResult {
  markdown: string;
  sources: FormattedSource[];
  jobData?: {
      clientName: string;
      clientAddress: string;
      supplyOption: string;
      location: string;
      lat?: number;
      lng?: number;
  }
}

export type JobStatus = 'Estimate' | 'Quoted' | 'In Progress' | 'Complete' | 'Invoiced' | 'Archived';

export type DocumentType = 'Quote' | 'RAMS' | 'Programme' | 'Email' | 'Invoice';

export interface Task {
  id: number;
  text: string;
  dueDate: string; // ISO string for simplicity
  assignee: string;
  isComplete: boolean;
}

export interface Job {
    id: number;
    name: string;
    clientName: string;
    clientAddress: string;
    status: JobStatus;
    estimate: EstimateResult;
    location: string;
    coords?: { lat: number; lng: number };
    createdAt: string;
    tasks?: Task[];
    documents?: {
        [key in DocumentType]?: string;
    };
}

export type SupplierCategory = 'Materials' | 'Subcontractor' | 'Plant Hire' | 'Other';

export interface Supplier {
  id: number;
  name: string;
  category: SupplierCategory;
  contactPerson: string;
  phone: string;
  email: string;
  notes: string;
}

export interface Checklist {
  id: string;
  title: string;
  description: string;
  items: { text: string; subItems?: string[] }[];
}

export type View = 'dashboard' | 'estimator' | 'jobs' | 'job-detail' | 'suppliers' | 'compliance' | 'profile' | 'jobs-map' | 'documents';

export interface Post {
  id: number;
  type: 'image' | 'video' | 'text';
  content: string; // base64 for image/video, text for generated post
  caption: string;
  createdAt: string;
}

export interface Testimonial {
  id: number;
  clientName: string;
  quote: string;
}

export interface PaymentOption {
  id: number;
  method: string;
  details: string;
}

export type ImageAspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type VideoAspectRatio = '16:9' | '9:16';

export interface ProfileData {
  name: string;
  company: string;
  specialization: string;
  slogan?: string;
  logo: string | null;
  banner: string | null;
  location: string;
  coords: { lat: number; lng: number };
  email: string;
  phone: string;
  website: string;
  paymentDetails: string; // Fallback for simple invoice text
  paymentOptions?: PaymentOption[]; // New structured payment options
  posts?: Post[];
  aboutUs?: string;
  testimonials?: Testimonial[];
  serviceArea?: string;
  certifications?: string[];
  socialLinks?: {
    linkedin?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  lastGeneratedImage?: string | null; // Added for AI image post captioning
}

export interface JobSummary {
  id: number;
  name: string;
  clientName: string;
  status: JobStatus;
  location: string;
}

export type Role = 'user' | 'assistant' | 'system';

// --- NEW Edge Function API Contract Types ---

// This `ConversationMessage` is used for sending to the Edge Function.
// It matches the existing app's structure to allow multi-modal input.
export type ConversationMessage = {
  role: Role;
  content: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  timestamp?: string;
};

// Request for Edge Function chat endpoint
export type ChatRequest = {
  model?: string;
  conversation: ConversationMessage[]; // Changed from 'input: string' to support existing app's conversation history
  jobId?: string | null;
  options?: { temperature?: number; maxTokens?: number; [k: string]: any };
  tools?: any[];
  toolConfig?: any;
  systemInstruction?: string; // Add system instruction for chat
};

// Response from Edge Function chat endpoint
export type ChatResponse = {
  id: string; // conversation id
  reply: string; // model's textual reply
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
  meta?: { sources?: FormattedSource[]; [k: string]: any }; // Allow meta to carry sources
  functionCalls?: any[]; // To support function calls from text chat
};

// Request for Edge Function voice endpoint
export type VoiceRequest = {
  model?: string;
  jobId?: string;
  options?: any;
  systemInstruction?: string; // Add system instruction for voice
  tools?: any[]; // Add tools for voice
};

// Response from Edge Function voice endpoint
export type VoiceResponse = {
  id: string;
  transcript: string; // Transcription of user's audio
  reply: string; // Model's textual reply
  ttsAudioUrl?: string; // URL or base64 of generated TTS audio
  meta?: any;
  functionCalls?: any[]; // To support function calls from voice chat
};

// Request for Edge Function image generation endpoint
export type ImageGenRequest = {
  model?: string;
  prompt: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  jobId?: string;
  referenceImageBase64?: string; // For image editing/referencing
};

// Response from Edge Function image generation endpoint
export type ImageGenResponse = {
  id: string;
  images: { url?: string; base64?: string }[];
  meta?: any;
};

// Request for Edge Function image analysis endpoint
export type ImageAnalyzeRequest = {
  file?: File; // For multipart upload
  imageUrl?: string; // For URL analysis
  base64Image?: string; // For base64 analysis if not using multipart
  prompt?: string;
};

// Response from Edge Function image analysis endpoint
export type ImageAnalyzeResponse = {
  id: string;
  description: string;
  labels?: string[];
  meta?: any;
};

// Fix: Embed AIStudio interface directly into the 'Window' interface to resolve type conflict.
// This is necessary because the environment expects `aistudio` to be of this explicit type.
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
