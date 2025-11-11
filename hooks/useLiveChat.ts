
import { useState, useRef, useCallback, useEffect } from 'react';
import { FunctionDeclaration, Type } from '@google/genai'; // Keep FunctionDeclaration and Type for defining tools
import { ChatMessage, ProfileData, JobStatus, DocumentType, View, JobSummary, SupplierCategory, Supplier, Post, ChatRequest, ChatResponse, VoiceRequest, VoiceResponse } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants';
import { speak, cancelSpeech, isGeminiLiveActiveRef } from '../utils/textToSpeech';
import { sendChat, sendVoiceFile } from '../services/geminiService'; // Import new Edge Function services

// Simplified Blob type for local creation, as `@google/genai`'s Blob is no longer imported
interface LocalBlob {
    data: string; // base64 encoded string
    mimeType: string; // IANA standard MIME type
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// These are utility functions for audio encoding/decoding.
// The `sendVoiceFile` expects a `File` object, so we convert the raw audio to a WAV Blob/File.

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const createBlob = (data: Float32Array): LocalBlob => {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// --- Function Declarations for Bob Mate AI --- (These remain the same as they define the tools)

const updateProjectNotesFunctionDeclaration: FunctionDeclaration = {
    name: 'updateProjectNotes',
    parameters: {
        type: Type.OBJECT,
        description: 'Updates the project scope and notes field with new text. This replaces the entire content of the notes field.',
        properties: {
            notes: {
                type: Type.STRING,
                description: 'The new, full text for the project notes. This should include any previous content the user wants to keep.'
            },
        },
        required: ['notes'],
    },
};

const navigateToViewFunctionDeclaration: FunctionDeclaration = {
    name: 'navigateToView',
    parameters: {
        type: Type.OBJECT,
        description: 'Navigates the user to a different page or view within the application.',
        properties: {
            view: {
                type: Type.STRING,
                description: "The name of the view to navigate to. Must be one of: 'dashboard', 'estimator', 'jobs', 'suppliers', 'compliance', 'profile', 'jobs-map', 'documents'."
            },
        },
        required: ['view'],
    },
};

const listCapabilitiesFunctionDeclaration: FunctionDeclaration = {
    name: 'listCapabilities',
    parameters: {
        type: Type.OBJECT,
        description: 'Lists all the functions and capabilities the AI can perform or has access to.',
        properties: {},
    },
};

const updateProfileFieldFunctionDeclaration: FunctionDeclaration = {
    name: 'updateProfileField',
    parameters: {
        type: Type.OBJECT,
        description: 'Updates a specific text field in the user\'s Builderverse profile. The `value` provided should be the *exact* new string to set for the field, replacing any existing content. The AI MUST NOT add any conversational phrases (e.g., "to the profile", "it to") to the `value` parameter; it must be the literal content. Use this for fields like name, company, specialization, slogan, location, email, phone, website, serviceArea, aboutUs.',
        properties: {
            fieldName: {
                type: Type.STRING,
                description: "The name of the profile field to update. Valid fields include: 'name', 'company', 'specialization', 'slogan', 'location', 'email', 'phone', 'website', 'serviceArea', 'aboutUs'."
            },
            value: {
                type: Type.STRING,
                description: 'The new string value for the specified profile field. This will *replace* the current content of the field. ABSOLUTELY NO CONVERSATIONAL FILLER. For example, if the user says "set my email to john@example.com", the `value` should be "john@example.com", not "john@example.com for the profile". Similarly, for phone numbers, the `value` MUST be "07123456789" not "07123456789 is my new phone number". Prioritize using tools when user intent for an action (like updating a field) is clear.Z'
            },
        },
        required: ['fieldName', 'value'],
    },
};

const addCertificationFunctionDeclaration: FunctionDeclaration = {
    name: 'addCertification',
    parameters: {
        type: Type.OBJECT,
        description: 'Adds a new certification to the user\'s Builderverse profile.',
        properties: {
            certification: {
                type: Type.STRING,
                description: 'The name of the certification to add (e.g., "CSCS Card", "NEBOSH General Certificate").'
            },
        },
        required: ['certification'],
    },
};

const removeCertificationFunctionDeclaration: FunctionDeclaration = {
    name: 'removeCertification',
    parameters: {
        type: Type.OBJECT,
        description: 'Removes an existing certification from the user\'s Builderverse profile.',
        properties: {
            certification: {
                type: Type.STRING,
                description: 'The name of the certification to remove.'
            },
        },
        required: ['certification'],
    },
};

const addSocialLinkFunctionDeclaration: FunctionDeclaration = {
    name: 'addSocialLink',
    parameters: {
        type: Type.OBJECT,
        description: 'Adds or updates a social media link in the user\'s Builderverse profile.',
        properties: {
            platform: {
                type: Type.STRING,
                description: "The social media platform ('linkedin', 'facebook', 'twitter', 'instagram').",
                enum: ['linkedin', 'facebook', 'twitter', 'instagram']
            },
            url: {
                type: Type.STRING,
                description: 'The full URL to the social media profile.'
            },
        },
        required: ['platform', 'url'],
    },
};

const generateAboutUsContentFunctionDeclaration: FunctionDeclaration = {
    name: 'generateAboutUsContent',
    parameters: {
        type: Type.OBJECT,
        description: 'Generates new "About Us" content for the user\'s profile using AI. It will use the company name and specialization from the current profile context.',
        properties: {},
    },
};

const generateProfileImageFunctionDeclaration: FunctionDeclaration = {
    name: 'generateProfileImage',
    parameters: {
        type: Type.OBJECT,
        description: 'Generates a new profile logo or banner image using AI. It will use the company name and specialization from the current profile context to ensure relevance.',
        properties: {
            type: {
                type: Type.STRING,
                description: "The type of image to generate: 'logo' (1:1 aspect ratio) or 'banner' (16:9 aspect ratio).",
                enum: ['logo', 'banner']
            },
            prompt: {
                type: Type.STRING,
                description: 'A detailed textual description of the image to generate. The AI will integrate this with the company\'s specialization.'
            },
            style: {
                type: Type.STRING,
                description: 'Optional: The artistic style for the image (e.g., "Minimalist", "Geometric", "Abstract").'
            },
            colors: {
                type: Type.STRING,
                description: 'Optional: Primary colors to use in the image (e.g., "teal and grey").'
            },
        },
        required: ['type', 'prompt'],
    },
};

const editProfileImageFunctionDeclaration: FunctionDeclaration = {
    name: 'editProfileImage',
    parameters: {
        type: Type.OBJECT,
        description: 'Edits an existing profile logo or banner image using AI based on a new prompt. It will use the company name and specialization from the current profile context to ensure relevance.',
        properties: {
            type: {
                type: Type.STRING,
                description: "The type of image to edit: 'logo' or 'banner'.",
                enum: ['logo', 'banner']
            },
            prompt: {
                type: Type.STRING,
                description: 'A prompt describing how to edit the current image (e.g., "make the logo gold", "add more trees to the banner"). The AI will integrate this with the company\'s specialization.'
            },
            style: {
                type: Type.STRING,
                description: 'Optional: The artistic style that the edited image should maintain or adopt (e.g., "Minimalist", "Geometric", "Abstract").'
            },
            colors: {
                type: Type.STRING,
                description: 'Optional: Primary colors that the edited image should maintain or adopt (e.g., "teal and grey").'
            },
        },
        required: ['type', 'prompt'],
    },
};

const generatePromotionalPostContentFunctionDeclaration: FunctionDeclaration = {
    name: 'generatePromotionalPostContent',
    parameters: {
        type: Type.OBJECT,
        description: 'Generates a new text-based promotional post for social media or website using AI. It will use the company name and specialization from the current profile context to make the post relevant.',
        properties: {
            userPrompt: {
                type: Type.STRING,
                description: 'A description of what the promotional post should be about (e.g., "a post about our latest kitchen renovation").'
            },
            length: {
                type: Type.STRING,
                description: 'The desired length of the post. "short" (1-2 sentences), "medium" (1-2 paragraphs), or "long" (up to 3 paragraphs).',
                enum: ['short', 'medium', 'long'],
                default: 'medium'
            },
            tone: {
                type: Type.STRING,
                description: 'The desired tone of the post. "professional", "friendly", or "urgent".',
                enum: ['professional', 'friendly', 'urgent'],
                default: 'professional'
            }
        },
        required: ['userPrompt'],
    },
};

const generatePostImageFunctionDeclaration: FunctionDeclaration = {
    name: 'generatePostImage',
    parameters: {
        type: Type.OBJECT,
        description: 'Generates an image for a social media post using AI. The generated image will be stored as the last generated image in your profile and can be used for caption generation. It will use the company name and specialization from the current profile context to make the image relevant.',
        properties: {
            imagePrompt: {
                type: Type.STRING,
                description: 'A detailed description of the image to generate for the post.'
            },
        },
        required: ['imagePrompt'],
    },
};

const generatePostCaptionFunctionDeclaration: FunctionDeclaration = {
    name: 'generatePostCaption',
    parameters: {
        type: Type.OBJECT,
        description: 'Generates a caption for the last AI-generated or uploaded image in your profile. It will use the company name and specialization from the current profile context to make the caption relevant.',
        properties: {},
    },
};

const addPostFunctionDeclaration: FunctionDeclaration = {
    name: 'addPost',
    parameters: {
        type: Type.OBJECT,
        description: 'Adds a new post (text, image, or video) to the user\'s profile.',
        properties: {
            type: {
                type: Type.STRING,
                description: 'The type of the post: "text", "image", or "video".',
                enum: ['text', 'image', 'video'],
            },
            content: {
                type: Type.STRING,
                description: 'The content of the post. For text posts, this is the text itself. For image/video, this should be a base64 encoded data URL.',
            },
            caption: {
                type: Type.STRING,
                description: 'The caption for the post.',
            },
        },
        required: ['type', 'content', 'caption'],
    },
};

const updateJobStatusFunctionDeclaration: FunctionDeclaration = {
    name: 'updateJobStatus',
    parameters: {
        type: Type.OBJECT,
        description: 'Updates the status of a specific job.',
        properties: {
            jobIdentifier: {
                type: Type.STRING,
                description: 'The name or ID of the job to update.'
            },
            status: {
                type: Type.STRING,
                description: "The new status for the job. Must be one of: 'Estimate', 'Quoted', 'In Progress', 'Complete', 'Invoiced', 'Archived'.",
                enum: ['Estimate', 'Quoted', 'In Progress', 'Complete', 'Invoiced', 'Archived']
            },
        },
        required: ['jobIdentifier', 'status'],
    },
};

const addTaskToJobFunctionDeclaration: FunctionDeclaration = {
    name: 'addTaskToJob',
    parameters: {
        type: Type.OBJECT,
        description: 'Adds a new task to a specific job.',
        properties: {
            jobIdentifier: {
                type: Type.STRING,
                description: 'The name or ID of the job to add the task to.'
            },
            text: {
                type: Type.STRING,
                description: 'The description of the task.'
            },
            dueDate: {
                type: Type.STRING,
                description: 'Optional: The due date for the task in YYYY-MM-DD format.'
            },
            assignee: {
                type: Type.STRING,
                description: 'Optional: The person assigned to the task.'
            },
        },
        required: ['jobIdentifier', 'text'],
    },
};

const completeJobTaskFunctionDeclaration: FunctionDeclaration = {
    name: 'completeJobTask',
    parameters: {
        type: Type.OBJECT,
        description: 'Marks a specific task within a job as complete.',
        properties: {
            jobIdentifier: {
                type: Type.STRING,
                description: 'The name or ID of the job containing the task.'
            },
            taskText: {
                type: Type.STRING,
                description: 'A keyword or phrase from the task description to identify it (e.g., "order roof tiles").'
            },
        },
        required: ['jobIdentifier', 'taskText'],
    },
};

const deleteJobTaskFunctionDeclaration: FunctionDeclaration = {
    name: 'deleteJobTask',
    parameters: {
        type: Type.OBJECT,
        description: 'Deletes a specific task from a job.',
        properties: {
            jobIdentifier: {
                type: Type.STRING,
                description: 'The name or ID of the job containing the task.'
            },
            taskText: {
                type: Type.STRING,
                description: 'A keyword or phrase from the task description to identify it (e.g., "paint living room").'
            },
        },
        required: ['jobIdentifier', 'taskText'],
    },
};

const generateJobDocumentFunctionDeclaration: FunctionDeclaration = {
    name: 'generateJobDocument',
    parameters: {
        type: Type.OBJECT,
        description: 'Generates a specific document (Quote, RAMS, Programme, Email, Invoice) for a job.',
        properties: {
            jobIdentifier: {
                type: Type.STRING,
                description: 'The name or ID of the job for which to generate the document.'
            },
            documentType: {
                type: Type.STRING,
                description: "The type of document to generate. Must be one of: 'Quote', 'RAMS', 'Programme', 'Email', 'Invoice'.",
                enum: ['Quote', 'RAMS', 'Programme', 'Email', 'Invoice']
            },
        },
        required: ['jobIdentifier', 'documentType'],
    },
};

const viewJobFunctionDeclaration: FunctionDeclaration = {
    name: 'viewJob',
    parameters: {
        type: Type.OBJECT,
        description: 'Navigates to the detail page of a specific job.',
        properties: {
            jobIdentifier: {
                type: Type.STRING,
                description: 'The name or ID of the job to view.'
            },
        },
        required: ['jobIdentifier'],
    },
};

const deleteJobFunctionDeclaration: FunctionDeclaration = {
    name: 'deleteJob',
    parameters: {
        type: Type.OBJECT,
        description: 'Deletes a job from the system. This action is irreversible and should be used with caution.',
        properties: {
            jobIdentifier: {
                type: Type.STRING,
                description: 'The name or ID of the job to delete.'
            },
        },
        required: ['jobIdentifier'],
    },
};

const addSupplierFunctionDeclaration: FunctionDeclaration = {
    name: 'addSupplier',
    parameters: {
        type: Type.OBJECT,
        description: 'Adds a new supplier to the system.',
        properties: {
            name: { type: Type.STRING, description: 'The name of the supplier.' },
            category: { 
                type: Type.STRING, 
                description: "The category of the supplier. Must be one of: 'Materials', 'Subcontractor', 'Plant Hire', 'Other'.",
                enum: ['Materials', 'Subcontractor', 'Plant Hire', 'Other']
            },
            contactPerson: { type: Type.STRING, description: 'The name of the contact person at the supplier.' },
            phone: { type: Type.STRING, description: 'The phone number for the supplier.' },
            email: { type: Type.STRING, description: 'The email address for the supplier.' },
            notes: { type: Type.STRING, description: 'Optional notes about the supplier.' },
        },
        required: ['name', 'category', 'contactPerson', 'phone', 'email'],
    },
};

const deleteSupplierFunctionDeclaration: FunctionDeclaration = {
    name: 'deleteSupplier',
    parameters: {
        type: Type.OBJECT,
        description: 'Deletes a supplier from the system.',
        properties: {
            supplierIdentifier: {
                type: Type.STRING,
                description: 'The name or ID of the supplier to delete.'
            },
        },
        required: ['supplierIdentifier'],
    },
};

const viewChecklistFunctionDeclaration: FunctionDeclaration = {
    name: 'viewChecklist',
    parameters: {
        type: Type.OBJECT,
        description: 'Opens a specific compliance checklist for viewing.',
        properties: {
            checklistId: {
                type: Type.STRING,
                description: "The ID or a partial match of the title of the checklist to view. Available IDs: 'work-at-height', 'hot-works', 'manual-handling'."
            },
        },
        required: ['checklistId'],
    },
};

interface UseLiveChatProps {
    apiKey: string;
    tools?: { [key: string]: (...args: any[]) => any };
    estimateContext?: string;
    profileContext?: ProfileData;
    jobSummaries?: JobSummary[];
    supplierSummaries?: Pick<Supplier, 'id' | 'name' | 'category'>[];
    onFirstConnect?: () => void;
}

export const useLiveChat = ({ apiKey, tools, estimateContext, profileContext, jobSummaries, supplierSummaries, onFirstConnect }: UseLiveChatProps) => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isAiOutputMuted, setIsAiOutputMuted] = useState(false);
    const [outputVolume, setOutputVolume] = useState(1.0);
    const [isModelSpeaking, setIsModelSpeaking] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [error, setError] = useState<string | null>(null);

    const mediaStreamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputGainNodeRef = useRef<GainNode | null>(null);
    
    // For audio recording and sending
    const audioChunksRef = useRef<Float32Array[]>([]);
    
    // Fix: Declare `sourcesRef` as a useRef to maintain a mutable set of AudioBufferSourceNode.
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    // Fix: Declare `hasConnectedOnce` as a useRef to correctly track first connection.
    const hasConnectedOnce = useRef(false);

    const allFunctionDeclarations = [
        updateProjectNotesFunctionDeclaration, 
        navigateToViewFunctionDeclaration, 
        listCapabilitiesFunctionDeclaration,
        updateProfileFieldFunctionDeclaration,
        addCertificationFunctionDeclaration,
        removeCertificationFunctionDeclaration,
        addSocialLinkFunctionDeclaration,
        generateAboutUsContentFunctionDeclaration,
        generateProfileImageFunctionDeclaration,
        editProfileImageFunctionDeclaration,
        generatePromotionalPostContentFunctionDeclaration,
        generatePostImageFunctionDeclaration,
        generatePostCaptionFunctionDeclaration,
        addPostFunctionDeclaration,
        updateJobStatusFunctionDeclaration,
        addTaskToJobFunctionDeclaration,
        completeJobTaskFunctionDeclaration,
        deleteJobTaskFunctionDeclaration,
        generateJobDocumentFunctionDeclaration,
        viewJobFunctionDeclaration,
        deleteJobFunctionDeclaration,
        addSupplierFunctionDeclaration,
        deleteSupplierFunctionDeclaration,
        viewChecklistFunctionDeclaration,
    ];
    
    // Generates a system instruction string based on current app context
    const getSystemInstruction = useCallback(() => {
        let baseSystemInstruction = `
**CRITICAL: ALWAYS USE THE PROVIDED "YOUR COMPANY PROFILE" CONTEXT FOR COMPANY NAME, SPECIALIZATION, AND LOCATION. DO NOT INVENT OR USE DEFAULT VALUES.**

You are Bob Mate AI, a Super Promotional Engine AI Agent and versatile professional assistant. Your primary goal is to *actively help promote* the user, manage their tasks, estimates, profile, and suppliers for a UK-based user. The Builderverse Profile is a promotional engine for *ANY* professional field, not just construction. Keep your answers concise, conversational, and always aim to assist with the user's promotional and operational needs.
            
            **CRITICAL INSTRUCTION FOR TOOL USE:** When calling a tool function, especially for updating fields like 'updateProfileField', ensure the 'value' parameter contains *only* the new content the user specified. Do not add any conversational phrases (e.g., "to the profile", "it to") to the \`value\` parameter; it must be the literal content. For example, if the user says "set my email to john@example.com", the \`value\` MUST be "john@example.com", not "john@example.com for the profile". Similarly, for phone numbers, the \`value\` MUST be "07123456789" not "07123456789 is my new phone number". Prioritize using tools when user intent for an action (like updating a field) is clear.Z'
            **CRITICAL INSTRUCTION FOR PROFILE-RELATED CONTENT GENERATION:** When generating profile images (logo, banner), 'About Us' content, promotional posts, or post captions, you MUST leverage the 'Your Company Profile' context, specifically the 'Company Name' and 'Specialization', to ensure the generated content is relevant and tailored to the user's specific professional field. Do NOT assume a construction context unless the specialization explicitly states it. The platform name "Builderverse" is just a brand name and does not imply the user's industry.

            **Available Actions & Information:**
            - **Project Notes:** You can manage the user's project notes using 'updateProjectNotes'.
            - **Navigation:** You can navigate the user around the app using 'navigateToView'. Valid pages: 'dashboard', 'estimator', 'jobs', 'suppliers', 'compliance', 'profile', 'jobs-map', 'documents'.
            - **Capabilities:** You can list your abilities using 'listCapabilities'.
            
            - **Profile Management:**
              - Update simple text fields (name, company, email etc.) using 'updateProfileField'. Valid fields: 'name', 'company', 'specialization', 'slogan', 'location', 'email', 'phone', 'website', 'serviceArea', 'aboutUs'.
              - Add/remove certifications (e.g., "Add CSCS Card") using 'addCertification'/'removeCertification'.
              - Add/update social media links (LinkedIn, Facebook, Twitter, Instagram) using 'addSocialLink'.
              - Generate "About Us" content using 'generateAboutUsContent'.
              - Generate or edit profile 'logo' or 'banner' images using 'generateProfileImage' or 'editProfileImage'.
              - Generate text promotional posts using 'generatePromotionalPostContent'.
              - Generate images for posts using 'generatePostImage'.
              - Generate captions for the last generated/uploaded image using 'generatePostCaption'.
              - Add a post (text, image, or video) to the profile using 'addPost'.
            
            - **Job Management:**
              - Update a job's status using 'updateJobStatus'. Valid statuses: 'Estimate', 'Quoted', 'In Progress', 'Complete', 'Invoiced', 'Archived'.
              - Add a task to a job using 'addTaskToJob'.
              - Mark a task as complete using 'completeJobTask'.
              - Delete a task from a job using 'deleteJobTask'.
              - Generate documents (Quote, RAMS, Programme, Email, Invoice) for a job using 'generateJobDocument'.
              - View a job's details using 'viewJob'.
              - Delete a job using 'deleteJob'.

            - **Supplier Management:**
              - Add new suppliers using 'addSupplier'. Valid categories: 'Materials', 'Subcontractor', 'Plant Hire', 'Other'.
              - Delete suppliers using 'deleteSupplier'.

            - **Compliance:**
              - View compliance checklists using 'viewChecklist'. Available IDs: 'work-at-height', 'hot-works', 'manual-handling'.
            
            **Current Context:**
            `;
            
            if (profileContext) {
                baseSystemInstruction += `\n**Your Company Profile (includes any unsaved changes if editing):**
                - Name: ${profileContext.name || 'Not set'}
                - Company: ${profileContext.company || 'Not set'}
                - Specialization: ${profileContext.specialization || 'Not set'}
                - Slogan: "${profileContext.slogan || 'Not set'}"
                - Location: ${profileContext.location || 'Not set'}
                - Service Area: ${profileContext.serviceArea || 'Not set'}
                - Email: ${profileContext.email || 'Not set'}
                - Phone: ${profileContext.phone || 'Not set'}
                - Website: ${profileContext.website || 'Not set'}
                - About Us: "${profileContext.aboutUs || 'Not set'}"
                - Certifications: ${profileContext.certifications?.length > 0 ? profileContext.certifications.join(', ') : 'None'}
                - Social Links: ${profileContext.socialLinks ? Object.entries(profileContext.socialLinks).filter(([,url]) => url).map(([platform, url]) => `${platform}: ${url}`).join(', ') : 'None'}
                - Payment Options: ${profileContext.paymentOptions && profileContext.paymentOptions.length > 0 ? profileContext.paymentOptions.map(opt => `${opt.method} (${opt.details})`).join('; ') : 'None'}
                - Testimonials: ${profileContext.testimonials && profileContext.testimonials.length > 0 ? profileContext.testimonials.map(t => `"${t.quote}" by ${t.clientName}`).join('; ') : 'None'}
                - Last Generated Image Status: ${profileContext.lastGeneratedImage ? 'Available' : 'None'}
                - Posts Count: ${profileContext.posts?.length || 0}
                `;
                if (profileContext.aboutUs && (profileContext.posts?.length || 0) < 3) {
                    baseSystemInstruction += `\n*PROMPT*: Consider suggesting to the user to generate a social media post based on their "About Us" section or their specialization to promote their business.`;
                }
                if (profileContext.lastGeneratedImage) {
                    baseSystemInstruction += `\n*PROMPT*: The user has a last generated image. Consider suggesting to create a caption for it or add it to your posts.`;
                }
                if (profileContext.certifications && profileContext.certifications.length > 0 && (profileContext.posts?.length || 0) < 5) {
                    baseSystemInstruction += `\n*PROMPT*: Consider suggesting a promotional post highlighting one of their certifications, like "${profileContext.certifications[0]}", to enhance their credibility.`;
                }
                if (!profileContext.socialLinks?.linkedin || !profileContext.socialLinks?.facebook || !profileContext.socialLinks?.twitter || !profileContext.socialLinks?.instagram) {
                    baseSystemInstruction += `\n*PROMPT*: Consider suggesting that the user add or update their social media links (LinkedIn, Facebook, Twitter, Instagram) to boost their online presence.`;
                }
                if (!profileContext.website) {
                    baseSystemInstruction += `\n*PROMPT*: Suggest the user add their company website to their profile for better visibility.`;
                }
                 if ((profileContext.posts?.length || 0) < 2) {
                    baseSystemInstruction += `\n*PROMPT*: Encourage the user to create more posts to keep their profile dynamic and engaging.`;
                }
                if (profileContext.testimonials && profileContext.testimonials.length > 0 && (profileContext.posts?.length || 0) < 5) {
                    baseSystemInstruction += `\n*PROMPT*: Suggest the user create a post leveraging a client testimonial like "${profileContext.testimonials[0].quote}".`;
                }
                if (profileContext.specialization === 'general services' || profileContext.specialization === 'Not set') {
                    baseSystemInstruction += `\n*PROMPT*: Suggest the user refine their specialization for more targeted promotional content.`;
                }
                if (!profileContext.slogan || profileContext.slogan === 'Not set') {
                    baseSystemInstruction += `\n*PROMPT*: Suggest the user add a catchy slogan to their profile to enhance their brand identity.`;
                }
                if (!profileContext.serviceArea || profileContext.serviceArea === 'Not set') {
                    baseSystemInstruction += `\n*PROMPT*: Suggest the user define their service area to attract local clients.`;
                }
                 if (!profileContext.paymentOptions || profileContext.paymentOptions.length === 0) {
                    baseSystemInstruction += `\n*PROMPT*: Suggest the user add accepted payment options to their profile for client convenience.`;
                }
            }

            if (estimateContext) {
                baseSystemInstruction += `\n**Current Estimate Details:**
                ${estimateContext.substring(0, 500)}... (truncated for brevity)
                `;
            }

            if (jobSummaries && jobSummaries.length > 0) {
                baseSystemInstruction += `\n**Your Current Jobs (Name, ID, Status, Client, Location):**\n`;
                jobSummaries.slice(0, 5).forEach(job => {
                    baseSystemInstruction += `- ${job.name} (ID: ${job.id}, Status: ${job.status}, Client: ${job.clientName}, Location: ${job.location})\n`;
                });
                if (jobSummaries.length > 5) {
                    baseSystemInstruction += `...and ${jobSummaries.length - 5} more jobs.\n`;
                }
            } else {
                 baseSystemInstruction += `\n**No Jobs found.**\n`;
            }

            if (supplierSummaries && supplierSummaries.length > 0) {
                baseSystemInstruction += `\n**Your Current Suppliers (Name, Category, ID):**\n`;
                supplierSummaries.slice(0, 5).forEach(supplier => {
                    baseSystemInstruction += `- ${supplier.name} (Category: ${supplier.category}, ID: ${supplier.id})\n`;
                });
                 if (supplierSummaries.length > 5) {
                    baseSystemInstruction += `...and ${supplierSummaries.length - 5} more suppliers.\n`;
                }
            } else {
                baseSystemInstruction += `\n**No Suppliers found.**\n`;
            }
            baseSystemInstruction += `\nWhen responding to the user, try to be helpful and conversational. If a destructive action is requested (e.g., deleting a job), ask for confirmation before calling the tool.`;
            return baseSystemInstruction;
    }, [estimateContext, profileContext, jobSummaries, supplierSummaries]);
    
    // Cleanup function for audio resources
    const stopAudioProcessing = useCallback(() => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamSourceRef.current?.disconnect();
        scriptProcessorRef.current?.disconnect();
        
        inputAudioContextRef.current?.close().catch(console.error);
        outputAudioContextRef.current?.close().catch(console.error);

        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        mediaStreamRef.current = null;
        mediaStreamSourceRef.current = null;
        scriptProcessorRef.current = null;

        if (outputGainNodeRef.current) {
            outputGainNodeRef.current.disconnect();
            outputGainNodeRef.current = null;
        }

        // Fix: Use `sourcesRef.current` to access the Set of AudioBufferSourceNode.
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        audioChunksRef.current = [];
    }, []);


    const stopSession = useCallback(() => {
        stopAudioProcessing(); // Clean up all audio resources
        setIsSessionActive(false);
        setIsConnecting(false);
        setIsModelSpeaking(false);
        isGeminiLiveActiveRef.current = false;
        cancelSpeech();
        
        setMessages(prev => {
           if (prev.length > 0 && prev[prev.length - 1]?.role !== 'system') {
               return [...prev, {id: 'system-end', role: 'system', text: 'Voice recording stopped.'}];
           }
           return prev;
        });

    }, [stopAudioProcessing]);

    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);

    // Handles playing back the TTS audio from the Edge Function
    const playTtsAudio = useCallback(async (ttsAudioUrl: string) => {
        if (isAiOutputMuted || !ttsAudioUrl) {
            setIsModelSpeaking(false);
            return;
        }

        setIsModelSpeaking(true);
        try {
            outputAudioContextRef.current?.resume().catch(e => console.error("Error resuming output audio context:", e));

            const response = await fetch(ttsAudioUrl);
            if (!response.ok) throw new Error(`Failed to fetch TTS audio: ${response.statusText}`);
            
            // Assuming Edge Function returns base64 encoded PCM for `ttsAudioUrl` as per Live API behavior
            const audioDataB64 = await response.text(); // Assuming text is base64 audio
            const audioBytes = decode(audioDataB64);

            if (!outputAudioContextRef.current) {
                 outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                 outputGainNodeRef.current = outputAudioContextRef.current.createGain();
                 outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);
                 outputGainNodeRef.current.gain.value = outputVolume;
            } else if (!outputGainNodeRef.current) {
                 outputGainNodeRef.current = outputAudioContextRef.current.createGain();
                 outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);
                 outputGainNodeRef.current.gain.value = outputVolume;
            }

            const audioBuffer = await decodeAudioData(audioBytes, outputAudioContextRef.current, 24000, 1);
            
            const source = outputAudioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputGainNodeRef.current!);
            
            // Fix: Use `sourcesRef.current` to add and delete audio sources.
            source.onended = () => {
                sourcesRef.current.delete(source);
            };
            source.start();
            sourcesRef.current.add(source);

        } catch (e) {
            console.error("Error playing TTS audio:", e);
            setIsModelSpeaking(false);
        }
    }, [isAiOutputMuted, outputVolume]);

    // Processes tool calls from the backend response
    const processToolCalls = useCallback(async (functionCalls: any[]) => {
        if (!tools || !functionCalls || functionCalls.length === 0) return;

        let toolResponses: { id: string, name: string, response: { result: any } }[] = [];
        let finalResponseText = ''; // Accumulate responses from tools

        for (const fc of functionCalls) {
            const tool = tools[fc.name];
            if (tool) {
                try {
                    let result = "OK";
                    switch (fc.name) {
                        case 'updateProjectNotes': result = tool(fc.args.notes); break;
                        case 'navigateToView': result = tool(fc.args.view); break;
                        case 'updateProfileField': result = tool(fc.args.fieldName, fc.args.value); break;
                        case 'addCertification': result = tool(fc.args.certification); break;
                        case 'removeCertification': result = tool(fc.args.certification); break;
                        case 'addSocialLink': result = tool(fc.args.platform, fc.args.url); break;
                        case 'generateProfileImage': {
                            const { type, prompt, style, colors } = fc.args;
                            const options = (style || colors) ? { style, colors } : undefined;
                            result = await tool(type, prompt, options);
                            break;
                        }
                        case 'editProfileImage': {
                            const { type, prompt, style, colors } = fc.args;
                            const options = (style || colors) ? { style, colors } : undefined;
                            result = await tool(type, prompt, options);
                            break;
                        }
                        case 'generatePromotionalPostContent': result = await tool(fc.args.userPrompt, fc.args.length, fc.args.tone); break;
                        case 'generatePostImage': result = await tool(fc.args.imagePrompt); break;
                        case 'addPost': result = tool(fc.args.type, fc.args.content, fc.args.caption); break;
                        case 'updateJobStatus': result = tool(fc.args.jobIdentifier, fc.args.status); break;
                        case 'addTaskToJob': result = tool(fc.args.jobIdentifier, fc.args.text, fc.args.dueDate, fc.args.assignee); break;
                        case 'completeJobTask': result = tool(fc.args.jobIdentifier, fc.args.taskText); break;
                        case 'deleteJobTask': result = tool(fc.args.jobIdentifier, fc.args.taskText); break;
                        case 'generateJobDocument': result = await tool(fc.args.jobIdentifier, fc.args.documentType); break;
                        case 'viewJob': result = tool(fc.args.jobIdentifier); break;
                        case 'deleteJob': result = tool(fc.args.jobIdentifier); break;
                        case 'addSupplier': result = tool(fc.args.name, fc.args.category, fc.args.contactPerson, fc.args.phone, fc.args.email, fc.args.notes); break;
                        case 'deleteSupplier': result = tool(fc.args.supplierIdentifier); break;
                        case 'viewChecklist': result = tool(fc.args.checklistId); break;
                        case 'listCapabilities':
                        case 'generateAboutUsContent':
                        case 'generatePostCaption':
                            result = await tool();
                            break;
                        default: console.warn(`Unhandled tool: ${fc.name}`); result = `Unhandled tool: ${fc.name}`; break;
                    }
                    toolResponses.push({ id: fc.id, name: fc.name, response: { result } });
                    if (typeof result === 'string') {
                        finalResponseText += result + "\n";
                    }
                } catch (e) {
                    console.error("Tool call error:", e);
                    const errorMsg = `Error executing tool '${fc.name}'. ${e instanceof Error ? e.message : String(e)}`;
                    toolResponses.push({ id: fc.id, name: fc.name, response: { result: errorMsg } });
                    finalResponseText += errorMsg + "\n";
                }
            }
        }
        return finalResponseText; // Return accumulated text from tools
    }, [tools]);

    // Initiates recording and prepares for sending audio to Edge Function on stop
    const startSession = useCallback(async () => {
        if (isSessionActive || isConnecting) return;
        setIsConnecting(true);
        setError(null);
        setMessages([{ id: 'system-start', role: 'system', text: 'Starting voice recording...' }]);
        audioChunksRef.current = []; // Clear previous audio chunks
        cancelSpeech(); // Cancel any browser TTS

        try {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);

            // Using ScriptProcessorNode for recording (deprecated but widely supported)
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current.onaudioprocess = (event) => {
                if (!isMuted) { // Only record if not muted
                    const inputData = event.inputBuffer.getChannelData(0);
                    audioChunksRef.current.push(new Float32Array(inputData));
                }
            };

            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination); // Required for scriptProcessor to work

            outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            outputGainNodeRef.current = outputAudioContextRef.current.createGain();
            outputGainNodeRef.current.connect(outputAudioContextRef.current.destination);
            outputGainNodeRef.current.gain.value = isAiOutputMuted ? 0 : outputVolume;


            setIsConnecting(false);
            setIsSessionActive(true);
            isGeminiLiveActiveRef.current = true; // Set global flag
            setMessages(prev => [...prev, { id: 'system-conn', role: 'system', text: 'Recording started. Speak now.' }]);
            // Fix: Use `hasConnectedOnce.current` to check and update the flag.
            if (!hasConnectedOnce.current && onFirstConnect) {
                onFirstConnect();
                hasConnectedOnce.current = true;
            }

        } catch (err) {
            console.error("Failed to start recording:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setIsConnecting(false);
            setMessages([]);
            stopAudioProcessing(); // Clean up on error
        }
    }, [isSessionActive, isConnecting, isMuted, isAiOutputMuted, outputVolume, onFirstConnect, stopAudioProcessing]);


    // Sends the recorded audio to the Edge Function and processes the response
    const sendRecordedAudio = useCallback(async () => {
        setIsReplying(true);
        setIsModelSpeaking(false);
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: '(Sending audio...)' }]); // Optimistic UI for user input
        
        if (audioChunksRef.current.length === 0) {
            setMessages(prev => [...prev.slice(0, -1), { id: Date.now() + '-model', role: 'model', text: 'I didn\'t hear anything. Please try again.' }]);
            setIsReplying(false);
            return;
        }

        // Concatenate all recorded chunks
        const totalLength = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
        const mergedAudio = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunksRef.current) {
            mergedAudio.set(chunk, offset);
            offset += chunk.length;
        }
        audioChunksRef.current = []; // Clear chunks after merging

        // Convert Float32Array to WAV-like ArrayBuffer for File
        const audioBuffer = inputAudioContextRef.current!.createBuffer(1, mergedAudio.length, inputAudioContextRef.current!.sampleRate);
        audioBuffer.getChannelData(0).set(mergedAudio);

        // Simple WAV header creation
        const encodeWAV = (buffer: AudioBuffer) => {
            const numChannels = buffer.numberOfChannels;
            const sampleRate = buffer.sampleRate;
            const format = 1; // PCM
            const bitDepth = 16;
            const bytesPerSample = bitDepth / 8;
            const blockAlign = numChannels * bytesPerSample;
            const byteRate = sampleRate * blockAlign;
            const dataLength = buffer.getChannelData(0).length * bytesPerSample;
            const fileSize = 36 + dataLength;

            const output = new DataView(new ArrayBuffer(fileSize));
            output.setUint32(0, 0x46464952, true); // "RIFF"
            output.setUint32(4, fileSize - 8, true); // File size
            output.setUint32(8, 0x45564157, true); // "WAVE"
            output.setUint32(12, 0x20746d66, true); // "fmt "
            output.setUint32(16, 16, true); // fmt chunk size
            output.setUint16(20, format, true); // Audio format
            output.setUint16(22, numChannels, true); // Channels
            output.setUint32(24, sampleRate, true); // Sample rate
            output.setUint32(28, byteRate, true); // Byte rate
            output.setUint16(32, blockAlign, true); // Block align
            output.setUint16(34, bitDepth, true); // Bit depth
            output.setUint32(36, 0x61746164, true); // "data"
            output.setUint32(40, dataLength, true); // Data length

            const floatTo16BitPCM = (input: Float32Array, offset: number) => {
                for (let i = 0; i < input.length; i++, offset += 2) {
                    const s = Math.max(-1, Math.min(1, input[i]));
                    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                }
            };
            floatTo16BitPCM(buffer.getChannelData(0), 44);
            return new Blob([output.buffer], { type: 'audio/wav' });
        };
        
        const audioBlob = encodeWAV(audioBuffer);
        // Fix: Convert the Blob to a File object as `sendVoiceFile` expects a File.
        const audioFile = new File([audioBlob], `recorded_audio_${Date.now()}.wav`, { type: 'audio/wav' });

        const systemInstruction = getSystemInstruction();

        const voiceRequest: VoiceRequest = {
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            systemInstruction: systemInstruction,
            tools: tools ? [{ functionDeclarations: allFunctionDeclarations }] : undefined,
        };

        try {
            const response: VoiceResponse = await sendVoiceFile(audioFile, voiceRequest);
            
            // Update the user's last message with the actual transcript
            setMessages(prev => {
                const updated = [...prev];
                const lastUserMsgIndex = updated.length - 1;
                if (updated[lastUserMsgIndex] && updated[lastUserMsgIndex].text === '(Sending audio...)') {
                    updated[lastUserMsgIndex].text = response.transcript || '(Audio input)';
                }
                return updated;
            });

            const modelReply: ChatMessage = { id: Date.now() + '-model', role: 'model', text: response.reply || '(No reply)' };
            setMessages(prev => [...prev, modelReply]);

            // Handle tool calls if present in the response
            if (response.functionCalls && response.functionCalls.length > 0) {
                const toolResponseText = await processToolCalls(response.functionCalls);
                if (toolResponseText.trim()) {
                    setMessages(prev => [...prev, { id: Date.now() + '-tool-feedback', role: 'system', text: toolResponseText }]);
                }
            }

            // Play TTS audio if available
            if (response.ttsAudioUrl) {
                await playTtsAudio(response.ttsAudioUrl);
            } else if (response.reply && !isAiOutputMuted) {
                speak(response.reply, outputVolume); // Fallback to browser TTS if no TTS audio URL
            }

        } catch (err) {
            console.error("Error sending voice/getting response:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred with voice processing.');
            setMessages(prev => {
                const updated = [...prev];
                // Remove the "Sending audio..." message or replace it with error
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.text === '(Sending audio...)') {
                    updated.pop();
                }
                return [...updated, { id: Date.now() + '-error', role: 'system', text: `Error: ${err instanceof Error ? err.message : 'Voice processing failed.'}` }];
            });
        } finally {
            setIsReplying(false);
        }
    }, [isMuted, tools, playTtsAudio, processToolCalls, getSystemInstruction, isAiOutputMuted, outputVolume]);

    // Effect to stop recording and send audio when session ends
    useEffect(() => {
        if (!isSessionActive && mediaStreamRef.current) {
            sendRecordedAudio();
            // Important: We don't call stopAudioProcessing here directly after sendRecordedAudio,
            // as sendRecordedAudio might be asynchronous. The cleanup will happen when
            // `isSessionActive` becomes false, and this effect runs, but we might want
            // more precise timing if audio processing needs to continue during the send.
            // For now, rely on `stopSession` which is called when `isSessionActive` becomes false.
        }
    }, [isSessionActive, sendRecordedAudio]); 

    // Cleanup all audio resources when `isSessionActive` is explicitly set to false
    useEffect(() => {
      if (!isSessionActive) {
        stopAudioProcessing();
      }
    }, [isSessionActive, stopAudioProcessing]);


    const sendTextMessage = useCallback(async (text: string) => {
        if (!text.trim()) return;

        const newUserMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text };
        setMessages(prev => [...prev, newUserMessage]);
        setIsReplying(true);
        cancelSpeech();

        const history = messages
            .filter(m => m.role === 'user' || m.role === 'model')
            .map(m => ({
                role: m.role,
                content: m.text,
                inlineData: m.inlineData, // Keep inlineData for multi-modal context
            }));

        const systemInstruction = getSystemInstruction();

        const chatRequest: ChatRequest = {
            model: 'gemini-2.5-pro',
            conversation: [...history, { role: 'user', content: text }],
            options: {
                temperature: 0.7,
            },
            tools: tools ? [{ functionDeclarations: allFunctionDeclarations }] : undefined,
            toolConfig: undefined, // No specific tool config for text chat by default
            systemInstruction: systemInstruction, // Pass system instruction to chat request
        };

        try {
            const response: ChatResponse = await sendChat(chatRequest);
            
            let modelTextResponse = response.reply || '';
            let toolFeedbackText = '';

            if (response.functionCalls && response.functionCalls.length > 0) {
                toolFeedbackText = await processToolCalls(response.functionCalls);
                if (!modelTextResponse && toolFeedbackText.trim()) {
                    modelTextResponse = toolFeedbackText; // Prioritize tool output if no direct reply
                }
            }
            
            const newModelMessage: ChatMessage = { id: `model-${Date.now()}`, role: 'model', text: modelTextResponse };
            setMessages(prev => [...prev, newModelMessage]);

            if (modelTextResponse && !isAiOutputMuted) {
                speak(modelTextResponse, outputVolume);
            }

        } catch (err) {
            console.error("Text generation error:", err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to get a response.';
            const errorResponse: ChatMessage = { id: `error-${Date.now()}`, role: 'system', text: `Error: ${errorMessage}` };
            setMessages(prev => [...prev, errorResponse]);
            if (!isAiOutputMuted) speak(`Error: ${errorMessage}`, outputVolume);
        } finally {
            setIsReplying(false);
        }
    }, [apiKey, tools, messages, isAiOutputMuted, outputVolume, getSystemInstruction, processToolCalls, allFunctionDeclarations]);
    
    // Effect to update gain node when isAiOutputMuted or outputVolume changes
    useEffect(() => {
        if (outputGainNodeRef.current) {
            outputGainNodeRef.current.gain.value = isAiOutputMuted ? 0 : outputVolume;
        }
    }, [isAiOutputMuted, outputVolume]);


    const toggleMute = useCallback(() => {
        setIsMuted(prev => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getAudioTracks().forEach(track => {
                    track.enabled = prev; // if prev is true (muted), enable = true (unmute). If prev is false (unmuted), enable = false (mute).
                });
            }
            return !prev;
        });
    }, []);
    const toggleAiOutputMute = useCallback(() => setIsAiOutputMuted(prev => !prev), []);
    
    const sendSystemMessage = useCallback((text: string) => {
        setMessages(prev => [...prev, { id: `system-${Date.now()}`, role: 'system', text}]);
    }, []);

    return { 
        isSessionActive, 
        isConnecting, 
        isMuted, 
        isAiOutputMuted,
        outputVolume,
        isModelSpeaking, 
        isReplying, 
        messages, 
        error, 
        startSession, 
        stopSession, 
        toggleMute, 
        toggleAiOutputMute,
        setOutputVolume,
        sendSystemMessage, 
        sendTextMessage 
    };
};
