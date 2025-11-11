
import { getAuthToken } from './authService';
import type { UploadedFile, Job, DocumentType, ProfileData, FormattedSource, ImageAspectRatio, VideoAspectRatio,
    ChatRequest, ChatResponse, VoiceRequest, VoiceResponse, ImageGenRequest, ImageGenResponse, ImageAnalyzeRequest, ImageAnalyzeResponse, ConversationMessage
} from '../types';

const API_BASE = (process.env.REACT_APP_API_BASE || '/api').replace(/\/+$/, '');
const SHOULD_MOCK = (process.env.GEMINI_MOCK === 'true') || false; // Enable mocking via environment variable
const MOCK_DELAY = 1000; // 1 second delay for mock responses

type AbortLike = { signal?: AbortSignal };

// --- Mock Data (for SHOULD_MOCK === true) ---
const mockImageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // A tiny transparent PNG

const mockChatResponse: ChatResponse = {
    id: "mock-chat-123",
    reply: "This is a mock response from Bob Mate AI. The estimated total for your project is **£50,000.00**.",
    usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    meta: {
        sources: [
            { type: 'web', uri: 'https://mock-pricing.example.com', title: 'Mock Regional Pricing Data' },
            { type: 'map', uri: 'https://mock-map.example.com', title: 'Mock Building Supplies Ltd' },
        ]
    },
    functionCalls: []
};

const mockVoiceResponse: VoiceResponse = {
    id: "mock-voice-456",
    transcript: "This is a mock transcription of your voice input.",
    reply: "Understood! This is a mock voice reply from Bob Mate AI, confirming your request.",
    ttsAudioUrl: "https://aistudiocdn.com/test-audio.mp3", // Could point to a static audio file
    meta: {},
    functionCalls: []
};

const mockImageGenResponse: ImageGenResponse = {
    id: "mock-img-gen-789",
    images: [{ base64: mockImageBase64, url: undefined }],
    meta: {}
};

const mockImageAnalyzeResponse: ImageAnalyzeResponse = {
    id: "mock-img-analyze-012",
    description: "This is a mock analysis result: The image appears to show a construction site with heavy machinery and safety protocols in place. Key elements include a crane, scaffolding, and workers wearing hard hats.",
    labels: ["Construction", "Safety", "Machinery"],
    meta: {}
};

// --- Generic JSON request helper for Edge Functions ---
async function requestJson<T>(path: string, init: RequestInit = {}, opts?: AbortLike): Promise<T> {
    if (SHOULD_MOCK) {
        return new Promise(resolve => {
            setTimeout(() => {
                let mockResponse: any;
                if (path.includes('/bobmate/chat')) mockResponse = mockChatResponse;
                else if (path.includes('/ai/generate-image')) mockResponse = mockImageGenResponse;
                else if (path.includes('/ai/analyze-image')) mockResponse = mockImageAnalyzeResponse;
                else if (path.includes('/ai/generate-video')) mockResponse = { images: [{ url: "https://aistudiocdn.com/test-video.mp4" }] };
                else mockResponse = { id: "mock-default", reply: "Mock response." };
                resolve(mockResponse as T);
            }, MOCK_DELAY);
        });
    }

    const token = await getAuthToken();
    const headers = new Headers(init.headers ?? {});

    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');

    // Only set Content-Type: application/json if not sending FormData
    if (!(init.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        credentials: 'include',
        signal: opts?.signal,
    });

    if (!res.ok) {
        let errBody: any = null;
        try { errBody = await res.json(); } catch (e) { /* ignore parse error */ }
        const message = errBody?.message || `${res.status} ${res.statusText}`;
        throw new Error(message);
    }
    return res.json() as Promise<T>;
}

// --- New Core Service Functions for Edge Functions ---

export async function sendChat(req: ChatRequest, opts?: AbortLike): Promise<ChatResponse> {
    if (SHOULD_MOCK) return new Promise(resolve => setTimeout(() => resolve(mockChatResponse), MOCK_DELAY));
    return requestJson<ChatResponse>('/bobmate/chat', {
        method: 'POST',
        body: JSON.stringify(req),
    }, opts);
}

export async function sendVoiceFile(file: File, req: VoiceRequest, opts?: AbortLike): Promise<VoiceResponse> {
    if (SHOULD_MOCK) return new Promise(resolve => setTimeout(() => resolve(mockVoiceResponse), MOCK_DELAY));
    
    const token = await getAuthToken();
    const form = new FormData();
    form.append('file', file);
    form.append('payload', JSON.stringify(req));

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/bobmate/voice`, {
        method: 'POST',
        body: form,
        headers,
        credentials: 'include',
        signal: opts?.signal,
    });

    if (!res.ok) {
        let errBody = null;
        try { errBody = await res.json(); } catch (e) { /* ignore parse error */ }
        const message = errBody?.message || `${res.status} ${res.statusText}`;
        throw new Error(message);
    }
    return res.json() as Promise<VoiceResponse>;
}

export async function generateImage(req: ImageGenRequest, opts?: AbortLike): Promise<ImageGenResponse> {
    if (SHOULD_MOCK) return new Promise(resolve => setTimeout(() => resolve(mockImageGenResponse), MOCK_DELAY));
    return requestJson<ImageGenResponse>('/ai/generate-image', {
        method: 'POST',
        body: JSON.stringify(req),
    }, opts);
}

export async function analyzeImage(req: ImageAnalyzeRequest, opts?: AbortLike): Promise<ImageAnalyzeResponse> {
    if (SHOULD_MOCK) return new Promise(resolve => setTimeout(() => resolve(mockImageAnalyzeResponse), MOCK_DELAY));
    
    if (req.file) {
        const token = await getAuthToken();
        const form = new FormData();
        form.append('file', req.file);
        if (req.prompt) form.append('prompt', req.prompt);

        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/ai/analyze-image`, {
            method: 'POST',
            body: form,
            headers,
            credentials: 'include',
            signal: opts?.signal,
        });

        if (!res.ok) {
            let errBody = null;
            try { errBody = await res.json(); } catch (e) { /* ignore parse error */ }
            const message = errBody?.message || `${res.status} ${res.statusText}`;
            throw new Error(message);
        }
        return res.json() as Promise<ImageAnalyzeResponse>;
    } else if (req.imageUrl || req.base64Image) {
        return requestJson<ImageAnalyzeResponse>('/ai/analyze-image', {
            method: 'POST',
            body: JSON.stringify(req),
        }, opts);
    }
    throw new Error("No image file, URL, or base64 provided for analysis.");
}

export async function generateVideo(req: ImageGenRequest, opts?: AbortLike): Promise<string> {
    if (SHOULD_MOCK) return new Promise(resolve => setTimeout(() => resolve("https://aistudiocdn.com/test-video.mp4"), MOCK_DELAY));
    
    const response = await requestJson<ImageGenResponse>('/ai/generate-video', {
        method: 'POST',
        body: JSON.stringify(req),
    }, opts);

    const videoUri = response.images?.[0]?.url;
    if (!videoUri) {
        throw new Error('Failed to retrieve video download link from Edge Function response.');
    }
    return videoUri;
}


// --- Refactored Application-Specific AI Service Functions ---

export const generateEstimate = async (
    // apiKey is no longer directly used for API calls, but kept in signature for compatibility if needed elsewhere
    apiKey: string, 
    clientName: string,
    clientAddress: string,
    supplyOption: string,
    location: string,
    useGrounding: boolean,
    projectNotes: string,
    uploadedFiles: UploadedFile[],
    lat?: number,
    lng?: number
): Promise<{ markdown: string, sources: FormattedSource[] }> => {

    const supplyText = supplyOption === 'labour_and_materials' ? 'Labour & Materials' : 'Labour Only';

    let contentString = `
**IDENTITY:** You are Estimator Pro Plus, a highly experienced and meticulous UK & Northern Ireland construction foreman/estimator/QS hybrid AI. All pricing, compliance, and terminology must align with current UK standards. Your primary directive is to protect the builder's position first by providing realistic and thorough estimates, highlighting risks, and identifying assumptions.

**TASK:** Generate a comprehensive and detailed cost estimate for the provided construction task.

**CRITICAL INSTRUCTION - QUANTITY EXTRACTION:** Crucially, infer and extract specific quantities (e.g., square meters (m²), linear meters (m), cubic meters (m³), number of items, weights) directly from any attached file(s) (e.g., plans, drawings, specification documents, photos) or from the project notes. If quantities cannot be precisely determined, make reasonable, clearly stated assumptions or indicate where further information is needed. ALWAYS EXPLICITLY STATE THE INFERRED QUANTITIES AND THEIR UNITS.

**CRITICAL INSTRUCTION - REGIONAL PRICING:** Your primary task is to find current, *regionally accurate* pricing. The 'Location' provided is paramount. You MUST use your web search tool to find up-to-date labour, material, and plant hire costs specifically for that UK region (e.g., London, Manchester, Glasgow, Belfast). Acknowledge that costs vary significantly across different UK pricing zones and reflect this in your breakdown. State the specific region for which pricing has been sourced.

**PROJECT DETAILS:**
- **Client Name:** ${clientName || 'Not provided'}
- **Client Address:** ${clientAddress || 'Not provided'}
- **Supply Option:** ${supplyText}
- **Location:** ${location}
- **Scope & Notes:** ${projectNotes || 'No additional notes provided.'}
`;

    const conversation: ConversationMessage[] = [{ role: 'user', content: contentString }];

    // Attach files by embedding their base64 directly into the content string.
    // This is a workaround for `bobmate/chat`'s `content: string` limitation.
    // A more robust backend should support multi-modal parts directly.
    uploadedFiles.forEach(file => {
        conversation.push({
            role: 'user',
            content: `Attached file: ${file.name} (Type: ${file.type}). Data: ${file.base64}`,
            inlineData: {
                mimeType: file.type,
                data: file.base64.split(',')[1], // Split to get just the base64 part
            }
        });
        contentString += `\n- **Attachment:** Analyze the attached file '${file.name}' for crucial context.`
    });

    // Add output structure
    contentString += `
    
**OUTPUT STRUCTURE (Use professional Markdown):**
1.  **Project Overview:** Briefly confirm the request, client, location, and inferred scope.
2.  **Quantity Summary:** List all quantities inferred from the provided information (notes, files) with their units. If assumptions were made, state them here clearly.
3.  **Detailed Cost Breakdown:** Present this in a Markdown table.
    *   Include itemized rates for:
        *   **Labour:** Hourly/daily rates, total hours/days, total labour cost per item/trade.
        *   **Materials:** Unit costs, quantities, total material cost per item/trade (if 'Labour & Materials').
        *   **Plant & Equipment:** Hire rates (daily/weekly), duration, total cost per item.
        *   **Subcontractor Costs:** (If applicable) Itemized breakdown of subcontractor packages, including individual subcontractor quotes/rates if inferred.
        *   **Waste Management:** Skip/grab hire costs, disposal fees, and associated labour for waste handling.
        *   **Preliminaries:** Site setup, welfare facilities, site management/supervision, insurances, permits, and other overheads directly associated with the project.
        *   **Contingency:** (Suggest 5-10% of sub-total, clearly state percentage and rationale). This covers unforeseen issues.
        *   **Profit & Overhead:** (Suggest 15-25% of sub-total, clearly state percentage). This covers company profit and ongoing business costs.
    *   All costs in GBP (£). Ensure totals for each category are clear.
4.  **Total Estimate:** Show the sub-total (before VAT), VAT (at 20%), and the final total clearly.
5.  **Key Assumptions & Exclusions:** List all key assumptions made (e.g., site access, ground conditions, working hours, material availability) and explicit exclusions (e.g., client-supplied items, specific regulatory fees, design fees, waste removal if not priced). This section is paramount for builder protection.
6.  **Compliance & Risk Flag:** Identify potential UK CDM 2015 / HSE (Health and Safety Executive) considerations and flag specific risks based on the description/attachments (e.g., "working at height", "asbestos risk", "ground contamination").
7.  **Next Actions:** Suggest 2-3 logical, builder-centric next steps (e.g., "Issue formal client quote", "Prepare site-specific RAMS", "Obtain detailed supplier quotes").
`;
    // Update the last message content to include the full prompt with attachments
    conversation[0].content = contentString;


    const chatRequest: ChatRequest = {
        model: 'gemini-2.5-pro',
        conversation: conversation,
        options: {
            temperature: 0.1,
        },
        tools: useGrounding ? [{ googleSearch: {} }] : undefined,
        toolConfig: (lat && lng && useGrounding) ? {
            retrievalConfig: {
                latLng: {
                    latitude: lat,
                    longitude: lng,
                }
            }
        } : undefined,
    };

    try {
        const response: ChatResponse = await sendChat(chatRequest);
        const markdown = response.reply;
        const sources: FormattedSource[] = response.meta?.sources || []; // Assume sources are in meta field

        return { markdown, sources };

    } catch (error) {
        console.error("Error generating estimate:", error);
        throw error;
    }
};

export const generateDocument = async (
    // apiKey is no longer directly used here
    apiKey: string, 
    job: Job,
    type: DocumentType,
    profileData?: ProfileData
): Promise<string> => {
    let taskDescription = '';
    const companyName = profileData?.company || 'Your Company';
    const specialization = profileData?.specialization || 'general services';

    switch (type) {
        case 'Quote':
            taskDescription = `Generate a formal client-facing quote based on the estimate. Format it professionally. Address it to ${job.clientName} at ${job.clientAddress}. Include company details (use '${companyName}' as company name and '${specialization}' as specialization), job description, a clear cost breakdown (from the estimate), payment terms, and a validity period.`;
            break;
        case 'RAMS':
            taskDescription = `**IDENTITY:** You are a NEBOSH-qualified Health and Safety officer for a UK company, '${companyName}', specializing in '${specialization}'.

            **TASK:** Generate a detailed, site-specific Risk Assessment and Method Statement (RAMS) for the job described below. The document must be comprehensive, professional, and compliant with UK HSE (Health and Safety Executive) regulations, including CDM 2015.

            **CRITICAL OUTPUT REQUIREMENTS:**
            1.  **Detailed Risk Assessment Matrix:** You MUST create a Markdown table for the risk assessment. It MUST include columns for at least: Hazard, Who is at risk?, Initial Risk Rating, Control Measures, and Residual Risk Rating.
            2.  **Step-by-Step Method Statement:** You MUST provide a clear, numbered, sequential list of instructions for how to complete the job safely from start to finish. This section is vital.

            **FULL OUTPUT STRUCTURE (Use clean Markdown):**
            
            1.  **Header:** Document Title (Risk Assessment & Method Statement), Project Name, Site Address, Document Date, Version.
            
            2.  **Risk Assessment:**
                *   Present this in a Markdown Table as required above.
                *   Use the following columns: **Hazard**, **Who is at risk?**, **Initial Risk Rating (L x S = R)**, **Control Measures**, **Residual Risk Rating (L x S = R)**.
                *   Provide a key for the ratings: L = Likelihood (1-5), S = Severity (1-5), R = Risk (L x S).
                *   Identify at least 5-10 credible hazards based on the job description. For each hazard, provide specific and practical control measures.

            3.  **Method Statement:**
                *   **Purpose:** A brief overview of the works to be carried out.
                *   **Personnel & PPE:** Specify roles required and mandatory Personal Protective Equipment.
                *   **Step-by-Step Procedure:** As required above, write the clear, numbered, sequential procedure for safely completing the job. This must be practical for a builder to follow.
                *   **Welfare Arrangements:** Confirm arrangements for toilets, washing facilities, drinking water.
                *   **Emergency Procedures:** Outline procedures for fire, first aid, and other foreseeable emergencies. Include the site address and a placeholder for emergency contact numbers.

            **CRITICAL CONTEXT INSTRUCTION:** Base all hazards, risks, and methods directly on the provided job and estimate details and the company's specialization. Be specific. For example, if the job is a 'rear extension' for a company specializing in 'groundworks', your RAMS should consider hazards like excavation, foundations, bricklaying, and working at height. Before finishing, double-check that you have included both the detailed risk assessment matrix and the step-by-step method statement as requested.`;
            break;
        case 'Programme':
            taskDescription = `Generate a simple project programme or schedule for '${companyName}', specializing in '${specialization}'. Break down the job into key phases and estimate durations. Present it in a clear format like a Markdown table or a numbered list.`;
            break;
        case 'Email':
            taskDescription = `Generate a professional, brief client-facing email body for ${job.clientName} from '${companyName}', specializing in '${specialization}'. The purpose is to send a document (like a quote or invoice). Include a placeholder for [Your Company Name]. Mention that the document is attached for their review and that you look forward to hearing from them. Keep it friendly and professional.`;
            break;
        case 'Invoice':
            let paymentInfo = `Include placeholders for: Payment Details (Bank Name, Sort Code, Account No).`;
            if (profileData) {
                if (profileData.paymentOptions && profileData.paymentOptions.length > 0) {
                    const optionsText = profileData.paymentOptions
                        .map(opt => `- **${opt.method}**: ${opt.details.replace(/\n/g, ' ')}`)
                        .join('\n');
                    paymentInfo = `Include the following payment options clearly in a 'Payment Information' section:\n${optionsText}`;
                } else if (profileData.paymentDetails) {
                    paymentInfo = `Use these specific payment details:\n${profileData.paymentDetails}`;
                }
            }
            taskDescription = `Generate a formal client-facing invoice for '${companyName}', specializing in '${specialization}', based on the estimate. It MUST be clearly titled 'INVOICE' and addressed to ${job.clientName} at ${job.clientAddress}. Format it professionally. Include placeholders for: Invoice Number, Invoice Date, and Due Date. ${paymentInfo} Use the cost breakdown from the original estimate. Ensure the final total is prominent.`;
            break;
    }

    const fullPrompt = `
**TASK:** ${taskDescription}

**JOB DETAILS:**
- **Project:** ${job.name}
- **Client Name:** ${job.clientName}
- **Client Address:** ${job.clientAddress}
- **Location:** ${job.location}
- **Status:** ${job.status}

**ESTIMATE SUMMARY / SCOPE OF WORK:**
${job.estimate.markdown}
`;

    const chatRequest: ChatRequest = {
        model: 'gemini-2.5-pro',
        conversation: [{ role: 'user', content: fullPrompt }],
        options: {
            temperature: 0.2,
        },
    };

    try {
        const response: ChatResponse = await sendChat(chatRequest);
        return response.reply;
    } catch (error) {
        console.error(`Error generating document (${type}):`, error);
        throw error;
    }
};

export const generateAboutUs = async (
    // apiKey is no longer directly used here
    apiKey: string, 
    profile: ProfileData
): Promise<string> => {
    const fullPrompt = `
**CRITICAL INSTRUCTION: You MUST use the provided 'COMPANY CONTEXT' for the company name and specialization. Do NOT use placeholder or generic company details.**

**IDENTITY:** You are a marketing copywriter for a company. Your tone should be professional, confident, and customer-focused.

**TASK:** Generate a professional and welcoming 'About Us' summary (2-3 short paragraphs) for the company's website profile. It should be engaging for potential clients.

**COMPANY CONTEXT:**
- **Company Name:** ${profile.company || 'A company'}
- **Specialization:** ${profile.specialization || 'general services'}
- **Based In:** ${profile.location || 'an unspecified location'}

**OUTPUT:** Generate only the text for the 'About Us' section. Do not include a title like "About Us". Just provide the paragraph(s). Ensure the content reflects the specialization provided.
`;
    const chatRequest: ChatRequest = {
        model: 'gemini-2.5-flash',
        conversation: [{ role: 'user', content: fullPrompt }],
        options: {
            temperature: 0.7,
        },
    };

    try {
        const response: ChatResponse = await sendChat(chatRequest);
        return response.reply;
    } catch (error) {
        console.error("Error generating About Us text:", error);
        throw error;
    }
};


export const generatePromotionalPost = async (
    // apiKey is no longer directly used here
    apiKey: string, 
    profile: ProfileData,
    userPrompt: string,
    length: 'short' | 'medium' | 'long' = 'medium',
    tone: 'professional' | 'friendly' | 'urgent' = 'professional'
): Promise<string> => {

    let lengthInstruction = '';
    switch (length) {
        case 'short':
            lengthInstruction = 'Keep it very concise, one or two sentences.';
            break;
        case 'medium':
            lengthInstruction = 'Aim for a 1-2 paragraph post.';
            break;
        case 'long':
            lengthInstruction = 'Generate a detailed post, up to 3 paragraphs.';
            break;
    }

    const fullPrompt = `
**CRITICAL INSTRUCTION: You MUST use the provided 'COMPANY CONTEXT' for the company name and specialization. Do NOT use placeholder or generic company details.**

**IDENTITY:** You are a marketing copywriter for a company. Your tone should be ${tone}.

**TASK:** Generate a promotional post for social media or a website based on the user's request. The post should be engaging and highlight the company's expertise. ${lengthInstruction}

**COMPANY CONTEXT:**
- **Company Name:** ${profile.company || 'A company'}
- **Specialization:** ${profile.specialization || 'general services'}
- **Location:** ${profile.location || 'an unspecified location'}
${profile.slogan ? `- **Slogan:** "${profile.slogan}"` : ''}
${profile.aboutUs ? `- **About Us Summary:** "${profile.aboutUs.substring(0, 200)}..."` : ''}

**USER PROMPT:** "${userPrompt}"

**OUTPUT:** Generate the post content. Do not include hashtags unless specifically requested by the user. Do not add a title or header. Ensure the content is relevant to the company's specialization and context.
`;

    const chatRequest: ChatRequest = {
        model: 'gemini-2.5-flash',
        conversation: [{ role: 'user', content: fullPrompt }],
        options: {
            temperature: 0.7,
        },
    };

    try {
        const response: ChatResponse = await sendChat(chatRequest);
        return response.reply;
    } catch (error) {
        console.error("Error generating promotional post:", error);
        throw error;
    }
};

/**
 * Generates a caption for an image by sending it along with a prompt to the chat endpoint.
 * This function uses a multi-modal approach by embedding the base64 directly into the chat message content.
 * @param apiKey Your Google Gemini API key (no longer directly used here).
 * @param profile ProfileData for contextual prompting.
 * @param imageBase64 The base64 data URL of the image (e.g., "data:image/png;base64,...").
 * @returns A string containing the AI-generated caption.
 */
export const generateCaptionForImage = async (
    // apiKey is no longer directly used here
    apiKey: string, 
    profile: ProfileData,
    imageBase64: string // data URL: "data:image/png;base64,..."
): Promise<string> => {
    const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error('Invalid image data URL');
    }
    const mimeType = match[1];
    const data = match[2];

    const promptText = `
**CRITICAL INSTRUCTION: You MUST use the provided company name and specialization. Do NOT use placeholder or generic company details.**
You are a marketing copywriter for a company named '${profile.company || 'A company'}' specializing in '${profile.specialization || 'general services'}'.
**Task:** Write a short, engaging promotional post caption for social media based on the provided image of our work. The tone should be professional, confident, and customer-focused. Highlight the quality and craftsmanship visible in the image. Do not use hashtags. Keep it to one or two paragraphs. The caption MUST be relevant to the company's specialization and the visual content of the image.
`;
    // Using `/bobmate/chat` for multi-modal input by embedding base64 image data.
    // This is a workaround for the current Edge Function API contract which defines `content: string`.
    const chatRequest: ChatRequest = {
        model: 'gemini-2.5-pro', // Using pro model for better understanding
        conversation: [
            {
                role: 'user',
                content: promptText,
                inlineData: {
                    mimeType: mimeType,
                    data: data,
                },
            },
        ],
    };

    try {
        const response: ChatResponse = await sendChat(chatRequest);
        return response.reply;
    } catch (error) {
        console.error("Error generating caption:", error);
        throw error;
    }
};

export const generateImageWithAi = async ( // Renamed to avoid conflict with `generateImage` from new services
    apiKey: string,
    userDescription: string,
    profile: ProfileData,
    type: 'logo' | 'banner' | 'post',
    referenceImageBase64?: string | null,
    aspectRatio: ImageAspectRatio = '1:1',
    options?: { style?: string; colors?: string; }
): Promise<string | null> => {
    const companyName = profile.company || 'A company';
    const specialization = profile.specialization || 'general professional services';
    const companySlogan = profile.slogan ? ` Slogan: "${profile.slogan}".` : '';

    let basePrompt = '';
    const styleDescription = options?.style ? ` Style: ${options.style}.` : '';
    const colorsDescription = options?.colors ? ` Primary colors: ${options.colors}.` : '';

    if (type === 'logo') {
        basePrompt = `A professional, square vector logo for a company named '${companyName}' specializing in '${specialization}'.${companySlogan} Incorporate elements reflecting '${specialization}'. The design should be clean, modern, and suitable for corporate branding on a transparent or white background.`;
    } else if (type === 'banner') {
        basePrompt = `A professional, wide 16:9 banner image for a company named '${companyName}' specializing in '${specialization}'.${companySlogan} Visual elements should reflect a modern and clean aesthetic, suitable for a professional website header. Focus on imagery strongly relevant to '${specialization}' and the overall brand.`;
    } else if (type === 'post') {
        basePrompt = `Generate an image for a social media post for a company named '${companyName}' specializing in '${specialization}'.${companySlogan} The image should be visually appealing and clearly relevant to the specialization.`;
    }

    const fullPrompt = `${basePrompt}${styleDescription}${colorsDescription}${userDescription.trim() ? ` ${userDescription.trim()}` : ''}`;

    try {
        // Consolidated logic. Always call `generateImage` service endpoint.
        // The `referenceImageBase64` is now passed directly to the `generateImage` service function,
        // assuming the backend's `/ai/generate-image` endpoint handles image-to-image editing
        // or referencing when this parameter is provided.
        const imageGenRequest: ImageGenRequest = {
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            aspectRatio: aspectRatio,
            width: aspectRatio === '1:1' ? 1024 : undefined, 
            height: aspectRatio === '1:1' ? 1024 : undefined,
            referenceImageBase64: referenceImageBase64 || undefined, 
        };
        const response = await generateImage(imageGenRequest); // Call the new Edge Function service
        if (response.images && response.images.length > 0) {
            return response.images[0].base64 || response.images[0].url;
        }
        return null;
    } catch (error) {
        console.error("Error generating image:", error);
        throw error;
    }
};

export const analyzeImageWithAi = async (
    // apiKey is no longer directly used here
    apiKey: string, 
    imageBase64: string,
    userPrompt: string
): Promise<string> => {
    const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
        throw new Error('Invalid image data URL for analysis');
    }
    const mimeType = match[1];
    const data = match[2];

    const imageAnalyzeRequest: ImageAnalyzeRequest = {
        base64Image: data,
        prompt: `Analyze the provided image. Respond to the following prompt: "${userPrompt}"`,
        // The Edge Function needs to support `base64Image` or `file` for multi-modal input.
        // Assuming base64 image can be sent in the JSON body for analysis.
    };

    try {
        const response: ImageAnalyzeResponse = await analyzeImage(imageAnalyzeRequest);
        return response.description; // Assume description contains the full analysis
    } catch (error) {
        console.error("Error analyzing image:", error);
        throw error;
    }
};

export const generateVideoWithAi = async ( // Renamed to avoid conflict with `generateVideo` from new services
    apiKey: string,
    prompt: string,
    aspectRatio: VideoAspectRatio,
    // Removed onProgress and signal due to current Edge Function API contract
): Promise<string> => {
    const videoGenRequest: ImageGenRequest = { // Using ImageGenRequest, adapt as needed on backend for video
        model: 'veo-3.1-fast-generate-preview', // Or 'veo-3.1-generate-preview'
        prompt: prompt,
        aspectRatio: aspectRatio,
    };

    try {
        // Call the new Edge Function service; it's expected to handle polling if necessary
        // and return the final video URI.
        const videoUri = await generateVideo(videoGenRequest);
        return videoUri;
    } catch (error) {
        console.error("Error generating video:", error);
        throw error;
    }
};
