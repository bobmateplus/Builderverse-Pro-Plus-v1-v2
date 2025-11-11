
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import InputForm from './components/InputForm';
import EstimateDisplay from './components/EstimateDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import ApiKeyInput from './components/ApiKeyInput';
import WelcomeBanner from './components/WelcomeBanner';
import ToastContainer from './components/ToastContainer';
import ChatWidget from './components/ChatWidget';
import JobsDashboard from './components/JobsDashboard';
import JobDetail from './components/JobDetail';
import DocumentViewer from './components/DocumentViewer';
import SuppliersDashboard from './components/SuppliersDashboard';
import ComplianceDashboard from './components/ComplianceDashboard';
import ChecklistModal from './components/ChecklistModal';
import Profile from './components/Profile';
import Dashboard from './components/Dashboard';
import JobsMapViewer from './components/JobsMapViewer';
import DocumentsDashboard from './components/DocumentsDashboard';
import AiBackground from './components/AiBackground'; // Import the AiBackground component
import { 
  generateEstimate, // Refactored to use Edge Function
  generateDocument, // Refactored to use Edge Function
  generateAboutUs,  // Refactored to use Edge Function
  generatePromotionalPost, // Refactored to use Edge Function
  generateCaptionForImage, // Refactored to use Edge Function
  generateImageWithAi, // Refactored to use Edge Function (replaces old generateImage)
  analyzeImageWithAi, // Refactored to use Edge Function (replaces old analyzeImage)
  generateVideoWithAi // Refactored to use Edge Function (replaces old generateVideo)
} from './services/geminiService';
import { CHECKLIST_TEMPLATES } from './constants';
import type { UploadedFile, ToastMessage, EstimateResult, Job, JobStatus, DocumentType, View, Supplier, Checklist, ProfileData, Task, JobSummary, Post, SupplierCategory } from './types';
import { useLiveChat } from './hooks/useLiveChat';
import { parseApiError } from './utils/errorHandler';

const getInitialApiKey = (): string | null => {
  return process.env.API_KEY || localStorage.getItem('gemini-api-key');
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(getInitialApiKey());
  const [isLoading, setIsLoading] = useState(false);
  const [estimateResult, setEstimateResult] = useState<EstimateResult | null>(null);
  const [projectNotes, setProjectNotes] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [proactiveMessage, setProactiveMessage] = useState<string | null>(null);
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [jobs, setJobs] = useState<Job[]>(() => {
      const savedJobs = localStorage.getItem('estimator-jobs');
      return savedJobs ? JSON.parse(savedJobs) : [];
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const savedSuppliers = localStorage.getItem('estimator-suppliers');
    return savedSuppliers ? JSON.parse(savedSuppliers) : [];
  });
  const [profileData, setProfileData] = useState<ProfileData>(() => {
    const saved = localStorage.getItem('builderProfile');
    const defaultProfile = {
        name: 'Pro Builder #1337',
        company: 'Constructa Corp',
        specialization: 'Groundworks & Foundations',
        slogan: 'Building Tomorrow, Today.',
        logo: null,
        banner: null,
        location: 'Manchester, UK',
        coords: { lat: 53.4808, lng: -2.2426 },
        email: '',
        phone: '',
        website: '',
        paymentDetails: '',
        paymentOptions: [],
        posts: [],
        aboutUs: '',
        testimonials: [],
        serviceArea: 'Greater Manchester, Cheshire, Lancashire',
        certifications: [],
        socialLinks: {
            linkedin: '',
            facebook: '',
            twitter: '',
            instagram: '',
        },
        lastGeneratedImage: null, // Initialize new field
    };
     if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure new fields exist for backward compatibility
        return { 
          ...defaultProfile, 
          ...parsed, 
          paymentOptions: parsed.paymentOptions || [],
          posts: parsed.posts || [],
          aboutUs: parsed.aboutUs || '',
          testimonials: parsed.testimonials || [],
          serviceArea: parsed.serviceArea || defaultProfile.serviceArea,
          slogan: parsed.slogan || defaultProfile.slogan,
          certifications: parsed.certifications || [],
          socialLinks: parsed.socialLinks || defaultProfile.socialLinks,
          lastGeneratedImage: parsed.lastGeneratedImage || null, // Initialize new field
        };
    }
    return defaultProfile;
  });
  // New state to hold profile data currently being edited (for AI context)
  const [currentEditingProfileData, setCurrentEditingProfileData] = useState<ProfileData | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [document, setDocument] = useState<{ type: DocumentType, content: string } | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [jobNameToSave, setJobNameToSave] = useState<string>('');
  
  const findJobIdByName = (name: string): number | undefined => {
      const job = jobs.find(j => j.name.toLowerCase() === name.toLowerCase());
      return job?.id;
  };

  const findSupplierIdByName = (name: string): number | undefined => {
      const supplier = suppliers.find(s => s.name.toLowerCase() === name.toLowerCase());
      return supplier?.id;
  };

  const chatTools = {
    updateProjectNotes: (notes: string) => {
      setProjectNotes(notes);
      addToast('Project notes updated by Bob Mate AI.', 'info');
      return "Okay, I've updated the project notes.";
    },
    navigateToView: (view: View): string => {
      const validViews: View[] = ['dashboard', 'estimator', 'jobs', 'suppliers', 'compliance', 'profile', 'jobs-map', 'documents'];
      if (validViews.includes(view)) {
        setCurrentView(view);
        return `Navigating to the ${view} page.`;
      } else {
        return `Sorry, I can't navigate to a page called '${view}'.`;
      }
    },
    listCapabilities: (): string => {
        const capabilities = [
            "I can update project notes (e.g., 'add fix the roof to the notes').",
            "I can navigate you to different pages like 'dashboard', 'estimator', 'jobs', 'suppliers', 'compliance', 'profile', 'jobs-map', or 'documents' (e.g., 'go to the jobs page').",
            "I can answer questions about the current estimate you're viewing.",
            "I can update your profile information (e.g., 'Change my company name to Apex Construction').",
            "I can manage your certifications (e.g., 'Add CSCS Card to my certifications').",
            "I can manage your social media links (e.g., 'Set my LinkedIn to https://linkedin.com/myprofile').",
            "I can generate 'About Us' content for your profile.",
            "I can generate or edit your profile logo or banner image.",
            "I can generate text posts, images for posts, and captions for posts.",
            "I can add or delete jobs (e.g., 'Delete job Smith Extension').",
            "I can update a job's status (e.g., 'Mark job Smith Extension as In Progress').",
            "I can add or complete tasks for a job (e.g., 'Add order roof tiles to Smith Extension job', 'Mark task install kitchen cabinets as complete for Smith Extension job').",
            "I can generate documents for a job, such as quotes, RAMS, programmes, emails, or invoices.",
            "I can add or delete suppliers (e.g., 'Add a new supplier Builders Merchant UK, materials, contact John, phone 01234567890, email john@bm.com').",
            "I can view compliance checklists (e.g., 'Show me the Working at Height checklist').",
        ];
        return `Here are some things I can do:\n${capabilities.map(c => `- ${c}`).join('\n')}`;
    },
    // --- New Profile Tools ---
    updateProfileField: (fieldName: string, value: string): string => {
        const validFields: Array<keyof ProfileData> = ['name', 'company', 'specialization', 'slogan', 'location', 'email', 'phone', 'website', 'serviceArea', 'aboutUs'];
        if (!validFields.includes(fieldName as keyof ProfileData)) {
            return `Sorry, I cannot update the field '${fieldName}'. It's not a direct editable text field via this function.`;
        }
        setProfileData(prev => ({ ...prev, [fieldName]: value.trim() }));
        setCurrentEditingProfileData(prev => prev ? { ...prev, [fieldName]: value.trim() } : null);

        addToast(`Profile: ${fieldName} updated to '${value.trim()}'.`, 'success');
        return `Okay, I've updated your company's ${fieldName}.`;
    },
    addCertification: (certification: string): string => {
        const targetProfile = currentEditingProfileData || profileData;
        if (targetProfile.certifications?.some(c => c.toLowerCase() === certification.toLowerCase())) {
            return `You already have '${certification}' listed.`;
        }
        setProfileData(prev => ({ ...prev, certifications: [...(prev.certifications || []), certification] }));
        setCurrentEditingProfileData(prev => prev ? { ...prev, certifications: [...(prev.certifications || []), certification] } : null);
        addToast(`Profile: Added certification '${certification}'.`, 'success');
        return `I've added '${certification}' to your certifications.`;
    },
    removeCertification: (certification: string): string => {
        const targetProfile = currentEditingProfileData || profileData;
        const updatedCerts = (targetProfile.certifications || []).filter(c => c.toLowerCase() !== certification.toLowerCase());
        if (updatedCerts.length === (targetProfile.certifications || []).length) {
            return `Could not find '${certification}' in your certifications to remove.`;
        }
        setProfileData(prev => ({ ...prev, certifications: updatedCerts }));
        setCurrentEditingProfileData(prev => prev ? { ...prev, certifications: updatedCerts } : null);
        addToast(`Profile: Removed certification '${certification}'.`, 'info');
        return `I've removed '${certification}' from your certifications.`;
    },
    addSocialLink: (platform: 'linkedin' | 'facebook' | 'twitter' | 'instagram', url: string): string => {
        const socialPlatforms = ['linkedin', 'facebook', 'twitter', 'instagram'];
        if (!socialPlatforms.includes(platform)) {
            return `Sorry, '${platform}' is not a recognized social media platform. Supported: ${socialPlatforms.join(', ')}.`;
        }
        try {
            new URL(url); // Basic URL validation
        } catch {
            return `That doesn't look like a valid URL. Please provide a full URL for ${platform}.`;
        }
        setProfileData(prev => ({ ...prev, socialLinks: { ...(prev.socialLinks || {}), [platform]: url } }));
        setCurrentEditingProfileData(prev => prev ? { ...prev, socialLinks: { ...(prev.socialLinks || {}), [platform]: url } } : null);
        addToast(`Profile: Updated ${platform} link.`, 'success');
        return `I've updated your ${platform} link to ${url}.`;
    },
    generateAboutUsContent: async (): Promise<string> => {
        // API key is handled by Edge Function, no longer needed directly here
        // if (!apiKey) return "API key is not set, I cannot generate content.";
        try {
            addToast("Generating 'About Us' content...", 'info');
            const targetProfile = currentEditingProfileData || profileData;
            const result = await generateAboutUs(apiKey || '', targetProfile); // Uses new `generateAboutUs`
            setProfileData(prev => ({ ...prev, aboutUs: result }));
            setCurrentEditingProfileData(prev => prev ? { ...prev, aboutUs: result } : null);
            addToast("'About Us' content generated!", 'success');
            return "I've generated new 'About Us' content for your profile.";
        } catch (error) {
            addToast(parseApiError(error), 'error');
            return "I encountered an error trying to generate 'About Us' content.";
        }
    },
    generateProfileImage: async (type: 'logo' | 'banner', prompt: string, options?: { style?: string; colors?: string; }): Promise<string> => {
        // API key is handled by Edge Function, no longer needed directly here
        // if (!apiKey) return "API key is not set, I cannot generate images.";
        addToast(`Generating new ${type} for your profile...`, 'info');
        try {
            const targetProfile = currentEditingProfileData || profileData;
            let finalPrompt = prompt;
            
            if (options?.style) finalPrompt += ` Style: ${options.style}.`;
            if (options?.colors) finalPrompt += ` Colors: ${options.colors}.`;

            const result = await generateImageWithAi(apiKey || '', finalPrompt, targetProfile, type, null, type === 'banner' ? '16:9' : '1:1', options); // Uses new `generateImageWithAi`
            if (result) {
                const base64Image = result.startsWith('data:image') ? result : `data:image/png;base64,${result}`;
                setProfileData(prev => ({ ...prev, [type]: base64Image, lastGeneratedImage: base64Image }));
                setCurrentEditingProfileData(prev => prev ? { ...prev, [type]: base64Image, lastGeneratedImage: base64Image } : null);
                addToast(`${type} generated successfully!`, 'success');
                return `I've generated and updated your profile ${type}.`;
            } else {
                return `AI service returned an empty result for the ${type}.`;
            }
        } catch (error) {
            addToast(parseApiError(error), 'error');
            return "I encountered an error trying to generate the image. Please try again or refine your prompt.";
        }
    },
    editProfileImage: async (type: 'logo' | 'banner', prompt: string, options?: { style?: string; colors?: string; }): Promise<string> => {
        // API key is handled by Edge Function, no longer needed directly here
        // if (!apiKey) return "API key is not set, I cannot edit images.";
        const targetProfile = currentEditingProfileData || profileData;
        const currentImage = targetProfile[type];
        if (!currentImage) return `There is no existing ${type} to edit. Please generate one first.`;

        addToast(`Editing existing ${type} for your profile...`, 'info');
        try {
            const result = await generateImageWithAi(apiKey || '', prompt, targetProfile, type, currentImage, type === 'banner' ? '16:9' : '1:1', options); // Uses new `generateImageWithAi`
            if (result) {
                const base64Image = result.startsWith('data:image') ? result : `data:image/png;base64,${result}`;
                setProfileData(prev => ({ ...prev, [type]: base64Image, lastGeneratedImage: base64Image }));
                setCurrentEditingProfileData(prev => prev ? { ...prev, [type]: base64Image, lastGeneratedImage: base64Image } : null);
                addToast(`${type} edited successfully!`, 'success');
                return `I've edited and updated your profile ${type}.`;
            } else {
                return `AI service returned an empty result for the ${type} edit.`;
            }
        } catch (error) {
            addToast(parseApiError(error), 'error');
            return "I encountered an error trying to edit the image. Please try again or refine your prompt.";
        }
    },
    generatePromotionalPostContent: async (userPrompt: string, length: 'short' | 'medium' | 'long' = 'medium', tone: 'professional' | 'friendly' | 'urgent' = 'professional'): Promise<string> => {
        // API key is handled by Edge Function, no longer needed directly here
        // if (!apiKey) return "API key is not set, I cannot generate content.";
        addToast("Generating promotional text post...", 'info');
        try {
            const targetProfile = currentEditingProfileData || profileData;
            const result = await generatePromotionalPost(apiKey || '', targetProfile, userPrompt, length, tone); // Uses new `generatePromotionalPost`
            const newPost: Post = { id: Date.now(), type: 'text', content: result, caption: userPrompt, createdAt: new Date().toISOString() };
            setProfileData(prev => ({ ...prev, posts: [...(prev.posts || []), newPost] }));
            setCurrentEditingProfileData(prev => prev ? { ...prev, posts: [...(prev.posts || []), newPost] } : null);
            addToast('Text post generated and added to profile!', 'success');
            return `I've generated a new text post for you: "${result}"`;
        } catch (error) {
            addToast(parseApiError(error), 'error');
            return "I encountered an error trying to generate the text post.";
        }
    },
    generatePostImage: async (imagePrompt: string): Promise<string> => {
        // API key is handled by Edge Function, no longer needed directly here
        // if (!apiKey) return "API key is not set, I cannot generate images.";
        addToast("Generating image for a new post...", 'info');
        try {
            const targetProfile = currentEditingProfileData || profileData;
            const result = await generateImageWithAi(apiKey || '', imagePrompt, targetProfile, 'post', null, '1:1'); // Uses new `generateImageWithAi`
            if (result) {
                const base64Image = result.startsWith('data:image') ? result : `data:image/png;base64,${result}`;
                setProfileData(prev => ({ ...prev, lastGeneratedImage: base64Image }));
                setCurrentEditingProfileData(prev => prev ? { ...prev, lastGeneratedImage: base64Image } : null);
                addToast('Image generated!', 'success');
                return `I've generated an image for your post. You can now ask me to generate a caption for it, or add it to your posts.`;
            } else {
                return `AI service returned an empty image.`;
            }
        } catch (error) {
            addToast(parseApiError(error), 'error');
            return "I encountered an error trying to generate the image. Please try again or refine your prompt.";
        }
    },
    generatePostCaption: async (): Promise<string> => {
        // API key is handled by Edge Function, no longer needed directly here
        // if (!apiKey) return "API key is not set, I cannot generate captions.";
        const targetProfile = currentEditingProfileData || profileData;
        const lastImage = targetProfile.lastGeneratedImage;
        if (!lastImage) return "I don't have a previously generated or uploaded image to create a caption for.";

        addToast("Generating caption for the last image...", 'info');
        try {
            const result = await generateCaptionForImage(apiKey || '', targetProfile, lastImage); // Uses new `generateCaptionForImage`
            addToast('Caption generated!', 'success');
            return `Here's a caption for your image: "${result}".`;
        } catch (error) {
            addToast(parseApiError(error), 'error');
            return "I encountered an error trying to generate the caption.";
        }
    },
    addPost: (type: 'text' | 'image' | 'video', content: string, caption: string): string => {
        const newPost: Post = {
            id: Date.now(),
            type,
            content,
            caption,
            createdAt: new Date().toISOString(),
        };
        setProfileData(prev => ({ ...prev, posts: [...(prev.posts || []), newPost] }));
        setCurrentEditingProfileData(prev => prev ? { ...prev, posts: [...(prev.posts || []), newPost] } : null);
        addToast('New post added to your profile!', 'success');
        return `I've added a new ${type} post to your profile.`;
    },
    // --- New Job Tools ---
    updateJobStatus: (jobIdentifier: string | number, status: JobStatus): string => {
        const id = typeof jobIdentifier === 'number' ? jobIdentifier : findJobIdByName(jobIdentifier);
        if (!id) return `Sorry, I couldn't find a job named or with ID '${jobIdentifier}'.`;

        const jobToUpdate = jobs.find(j => j.id === id);
        if (!jobToUpdate) return `Job with ID '${id}' not found.`;
        
        const validStatuses: JobStatus[] = ['Estimate', 'Quoted', 'In Progress', 'Complete', 'Invoiced', 'Archived'];
        if (!validStatuses.includes(status)) {
            return `Invalid status '${status}'. Please use one of: ${validStatuses.join(', ')}.`;
        }

        setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
        addToast(`Job '${jobToUpdate.name}' status updated to '${status}'.`, 'success');
        return `Okay, I've updated the status of '${jobToUpdate.name}' to '${status}'.`;
    },
    addTaskToJob: (jobIdentifier: string | number, text: string, dueDate?: string, assignee?: string): string => {
        const id = typeof jobIdentifier === 'number' ? jobIdentifier : findJobIdByName(jobIdentifier);
        if (!id) return `Sorry, I couldn't find a job named or with ID '${jobIdentifier}'.`;

        const jobToUpdate = jobs.find(j => j.id === id);
        if (!jobToUpdate) return `Job with ID '${id}' not found.`;

        const newTask: Task = { id: Date.now(), text, dueDate: dueDate || '', assignee: assignee || '', isComplete: false };
        setJobs(prev => prev.map(j => j.id === id ? { ...j, tasks: [...(j.tasks || []), newTask] } : j));
        addToast(`Task '${text}' added to job '${jobToUpdate.name}'.`, 'success');
        return `I've added the task '${text}' to '${jobToUpdate.name}'.`;
    },
    completeJobTask: (jobIdentifier: string | number, taskText: string): string => {
        const id = typeof jobIdentifier === 'number' ? jobIdentifier : findJobIdByName(jobIdentifier);
        if (!id) return `Sorry, I couldn't find a job named or with ID '${jobIdentifier}'.`;

        const jobToUpdate = jobs.find(j => j.id === id);
        if (!jobToUpdate) return `Job with ID '${id}' not found.`;

        const task = jobToUpdate.tasks?.find(t => t.text.toLowerCase().includes(taskText.toLowerCase()));
        if (!task) return `Could not find a task matching '${taskText}' in job '${jobToUpdate.name}'.`;
        if (task.isComplete) return `Task '${task.text}' is already complete.`;

        setJobs(prev => prev.map(j => j.id === id ? { ...j, tasks: (j.tasks || []).map(t => t.id === task.id ? { ...t, isComplete: true } : t) } : j));
        addToast(`Task '${task.text}' in job '${jobToUpdate.name}' marked as complete.`, 'success');
        return `I've marked '${task.text}' as complete for '${jobToUpdate.name}'.`;
    },
    deleteJobTask: (jobIdentifier: string | number, taskText: string): string => {
        const id = typeof jobIdentifier === 'number' ? jobIdentifier : findJobIdByName(jobIdentifier);
        if (!id) return `Sorry, I couldn't find a job named or with ID '${jobIdentifier}'.`;

        const jobToUpdate = jobs.find(j => j.id === id);
        if (!jobToUpdate) return `Job with ID '${id}' not found.`;

        const initialTaskCount = jobToUpdate.tasks?.length || 0;
        const updatedTasks = (jobToUpdate.tasks || []).filter(t => !t.text.toLowerCase().includes(taskText.toLowerCase()));

        if (updatedTasks.length === initialTaskCount) {
            return `Could not find a task matching '${taskText}' in job '${jobToUpdate.name}'.`;
        }

        setJobs(prev => prev.map(j => j.id === id ? { ...j, tasks: updatedTasks } : j));
        addToast(`Task matching '${taskText}' deleted from job '${jobToUpdate.name}'.`, 'info');
        return `I've deleted tasks matching '${taskText}' from '${jobToUpdate.name}'.`;
    },
    generateJobDocument: async (jobIdentifier: string | number, documentType: DocumentType): Promise<string> => {
        // API key is handled by Edge Function, no longer needed directly here
        // if (!apiKey) return "API key is not set, I cannot generate documents.";
        const id = typeof jobIdentifier === 'number' ? jobIdentifier : findJobIdByName(jobIdentifier);
        if (!id) return `Sorry, I couldn't find a job named or with ID '${jobIdentifier}'.`;

        const jobToGenerateFor = jobs.find(j => j.id === id);
        if (!jobToGenerateFor) return `Job with ID '${id}' not found.`;
        
        const validDocumentTypes: DocumentType[] = ['Quote', 'RAMS', 'Programme', 'Email', 'Invoice'];
        if (!validDocumentTypes.includes(documentType)) {
            return `Invalid document type '${documentType}'. Please choose one of: ${validDocumentTypes.join(', ')}.`;
        }

        addToast(`Generating ${documentType} for '${jobToGenerateFor.name}'...`, 'info');
        try {
            if (jobToGenerateFor.documents?.[documentType]) {
              setDocument({ type: documentType, content: jobToGenerateFor.documents[documentType]! });
              addToast(`${documentType} loaded from saved documents.`, 'info');
              return `${documentType} loaded from saved documents.`;
            }

            // Use the refactored generateDocument from geminiService
            const content = await generateDocument(apiKey || '', jobToGenerateFor, documentType, currentEditingProfileData || profileData);
            
            const updatedJob = {
                ...jobToGenerateFor,
                documents: {
                    ...jobToGenerateFor.documents,
                    [documentType]: content,
                },
            };
            
            setJobs(jobs => jobs.map(j => j.id === id ? updatedJob : j));
            setSelectedJob(updatedJob);
            setDocument({ type: documentType, content });
            addToast(`${documentType} generated successfully!`, 'success');
            return `I've generated the ${documentType} for '${jobToGenerateFor.name}'.`;
        } catch (error) {
            addToast(parseApiError(error), 'error');
            return `I encountered an error trying to generate the ${documentType}.`;
        }
    },
    viewJob: (jobIdentifier: string | number): string => {
        const id = typeof jobIdentifier === 'number' ? jobIdentifier : findJobIdByName(jobIdentifier);
        if (!id) return `Sorry, I couldn't find a job named or with ID '${jobIdentifier}'.`;

        const jobToView = jobs.find(j => j.id === id);
        if (!jobToView) return `Job with ID '${id}' not found.`;

        setSelectedJob(jobToView);
        setCurrentView('job-detail');
        return `Navigating to the details for '${jobToView.name}'.`;
    },
    deleteJob: (jobIdentifier: string | number): string => {
        const id = typeof jobIdentifier === 'number' ? jobIdentifier : findJobIdByName(jobIdentifier);
        if (!id) return `Sorry, I couldn't find a job named or with ID '${jobIdentifier}'.`;

        const jobToDelete = jobs.find(j => j.id === id);
        if (!jobToDelete) return `Job with ID '${id}' not found.`;

        setJobs(prev => prev.filter(j => j.id !== id));
        addToast(`Job '${jobToDelete.name}' deleted.`, 'info');
        if (selectedJob?.id === id) setSelectedJob(null);
        if (currentView === 'job-detail') setCurrentView('jobs');
        return `I've deleted the job '${jobToDelete.name}'.`;
    },
    // --- New Supplier Tools ---
    addSupplier: (name: string, category: string, contactPerson: string, phone: string, email: string, notes: string = ''): string => {
        const validCategories = ['Materials', 'Subcontractor', 'Plant Hire', 'Other'];
        if (!validCategories.includes(category)) {
            return `Invalid category '${category}'. Please use one of: ${validCategories.join(', ')}.`;
        }
        const newSupplier: Supplier = {
            id: Date.now(),
            name, category: category as SupplierCategory, contactPerson, phone, email, notes
        };
        setSuppliers(prev => [newSupplier, ...prev]);
        addToast(`Supplier '${name}' added.`, 'success');
        setCurrentView('suppliers');
        return `I've added '${name}' as a new supplier.`;
    },
    deleteSupplier: (supplierIdentifier: string | number): string => {
        const id = typeof supplierIdentifier === 'number' ? supplierIdentifier : findSupplierIdByName(supplierIdentifier);
        if (!id) return `Sorry, I couldn't find a supplier named or with ID '${supplierIdentifier}'.`;

        const supplierToDelete = suppliers.find(s => s.id === id);
        if (!supplierToDelete) return `Supplier with ID '${id}' not found.`;

        setSuppliers(prev => prev.filter(s => s.id !== id));
        addToast(`Supplier '${supplierToDelete.name}' deleted.`, 'info');
        return `I've deleted the supplier '${supplierToDelete.name}'.`;
    },
    // --- New Compliance Tools ---
    viewChecklist: (checklistId: string): string => {
        const checklist = CHECKLIST_TEMPLATES.find(c => c.id.toLowerCase() === checklistId.toLowerCase());
        if (!checklist) {
            const availableChecklists = CHECKLIST_TEMPLATES.map(c => `"${c.title}" (ID: ${c.id})`).join(', ');
            return `Sorry, I couldn't find a checklist with ID or title matching '${checklistId}'. Available checklists: ${availableChecklists}.`;
        }
        setSelectedChecklist(checklist);
        setCurrentView('compliance');
        return `Opening the '${checklist.title}' checklist.`;
    },
  };

  const liveChat = useLiveChat({ 
      apiKey: apiKey || '', 
      tools: chatTools, 
      estimateContext: estimateResult?.markdown,
      profileContext: currentEditingProfileData || profileData,
      jobSummaries: jobs.map(j => ({ id: j.id, name: j.name, clientName: j.clientName, status: j.status, location: j.location })),
      supplierSummaries: suppliers.map(s => ({ id: s.id, name: s.name, category: s.category })),
      onFirstConnect: () => {
        addToast("For mobile devices, audio output usually routes to the loudspeaker by default. If you experience issues, please check your device's audio settings or browser permissions.", 'info');
      }
  });

  // Restore view on initial load
  useEffect(() => {
    const savedView = localStorage.getItem('estimator-current-view') as View | null;
    const savedJobId = localStorage.getItem('estimator-selected-job-id');
    
    if (savedView) {
        if (savedView === 'job-detail' && savedJobId) {
            const job = jobs.find(j => j.id === parseInt(savedJobId, 10));
            if (job) {
                setSelectedJob(job);
                setCurrentView('job-detail');
            } else {
                setCurrentView('jobs');
            }
        } else {
            const validViews: View[] = ['dashboard', 'estimator', 'jobs', 'suppliers', 'compliance', 'profile', 'jobs-map', 'documents'];
            if (validViews.includes(savedView)) {
                setCurrentView(savedView);
            }
        }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('estimator-current-view', currentView);
    if (currentView === 'job-detail' && selectedJob) {
        localStorage.setItem('estimator-selected-job-id', selectedJob.id.toString());
    } else if (currentView !== 'job-detail') {
        localStorage.removeItem('estimator-selected-job-id');
    }
  }, [currentView, selectedJob]);


  useEffect(() => {
    localStorage.setItem('estimator-jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('estimator-suppliers', JSON.stringify(suppliers));
  }, [suppliers]);
  
  useEffect(() => {
    localStorage.setItem('builderProfile', JSON.stringify(profileData));
  }, [profileData]);

  const addToast = useCallback((message: string, type: 'error' | 'info' | 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
  }, []);

  const handleApiKeySubmit = (newApiKey: string) => {
    localStorage.setItem('gemini-api-key', newApiKey);
    setApiKey(newApiKey);
  };
  
  const handleResetApiKey = () => {
      localStorage.removeItem('gemini-api-key');
      setApiKey(null);
      setEstimateResult(null);
  }

  const handleEstimateRequest = async (
    clientName: string,
    clientAddress: string,
    jobName: string,
    supplyOption: string,
    location: string,
    useGrounding: boolean,
    notes: string,
    files: UploadedFile[],
    lat?: number,
    lng?: number
  ) => {
    // API key is handled by Edge Function, no longer needed directly here
    // if (!apiKey) {
    //   addToast('API Key is not set.', 'error');
    //   return;
    // }
    
    if (!location.trim()) {
        addToast('For a more accurate estimate, please provide a location.', 'info');
    }

    setIsLoading(true);
    setEstimateResult(null);
    setJobNameToSave(jobName);
    try {
      // Use the refactored generateEstimate from geminiService
      const result = await generateEstimate(
        apiKey || '', // Pass empty string if apiKey is null, as it's not directly used for service calls anymore
        clientName,
        clientAddress,
        supplyOption,
        location,
        useGrounding,
        notes,
        files,
        lat,
        lng
      );
      setEstimateResult({ ...result, jobData: { clientName, clientAddress, supplyOption, location, lat, lng } });

      if (result.markdown.toLowerCase().includes('error')) {
        addToast('The AI returned an error. Check the details below.', 'error');
      } else {
        addToast('Estimate generated successfully! Ask Bob Mate AI any questions.', 'success');
        setProactiveMessage("I've finished the estimate. Feel free to ask me any questions about the cost breakdown, risks, or next steps.");
      }
    } catch (error) {
      console.error(error);
      addToast(parseApiError(error), 'error');
      setEstimateResult(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveJob = () => {
      if (!estimateResult || !estimateResult.jobData) return;
      const jobName = jobNameToSave.trim() || (projectNotes || 'New Job').split('\n')[0].substring(0, 50);
      
      const newJob: Job = {
          id: Date.now(),
          name: jobName,
          clientName: estimateResult.jobData.clientName,
          clientAddress: estimateResult.jobData.clientAddress,
          status: 'Estimate',
          estimate: estimateResult,
          location: estimateResult.jobData.location,
          coords: (estimateResult.jobData.lat && estimateResult.jobData.lng) 
            ? { lat: estimateResult.jobData.lat, lng: estimateResult.jobData.lng } 
            : undefined,
          createdAt: new Date().toISOString(),
          tasks: [],
      };
      setJobs(prev => [newJob, ...prev]);
      addToast(`Job "${newJob.name}" saved successfully!`, 'success');
      setCurrentView('jobs');
  };

  const handleGenerateDocument = async (job: Job, type: DocumentType) => {
      // API key is handled by Edge Function, no longer needed directly here
      // if (!apiKey) {
      //     addToast('API Key is not set.', 'error');
      //     return;
      // }
      setIsDocLoading(true);
      setDocument(null);

      try {
        if (job.documents?.[type]) {
          setDocument({ type, content: job.documents[type]! });
          addToast(`${type} loaded from saved documents.`, 'info');
          return;
        }

        // Use the refactored generateDocument from geminiService
        const content = await generateDocument(apiKey || '', job, type, currentEditingProfileData || profileData);
        
        const updatedJob = {
            ...job,
            documents: {
                ...job.documents,
                [type]: content,
            },
        };
        
        setJobs(jobs => jobs.map(j => j.id === job.id ? updatedJob : j));
        setSelectedJob(updatedJob);
        setDocument({ type, content });
      } catch (error) {
          console.error(error);
          addToast(parseApiError(error), 'error');
      } finally {
          setIsDocLoading(false);
      }
  };

  const handleUpdateDocument = (jobId: number, docType: DocumentType, newContent: string) => {
      const updatedJobs = jobs.map(job => {
          if (job.id === jobId) {
              return {
                  ...job,
                  documents: {
                      ...job.documents,
                      [docType]: newContent,
                  },
              };
          }
          return job;
      });
      setJobs(updatedJobs);
      
      const updatedSelectedJob = updatedJobs.find(j => j.id === jobId);
      if (updatedSelectedJob) {
        setSelectedJob(updatedSelectedJob);
      }

      setDocument({ type: docType, content: newContent });
      addToast(`${docType} updated successfully!`, 'success');
  };
  
  const handleUpdateJobStatus = (jobId: number, status: JobStatus) => {
      setJobs(jobs => jobs.map(j => j.id === jobId ? {...j, status} : j));
      addToast(`Job status updated to "${status}"`, 'info');
      if(currentView !== 'job-detail'){
        setDocument(null);
      }
  };

  const handleAddTask = (jobId: number, task: Omit<Task, 'id' | 'isComplete'>) => {
    const newTask = { ...task, id: Date.now(), isComplete: false };
    const updatedJobs = jobs.map(job => {
      if (job.id === jobId) {
        return { ...job, tasks: [...(job.tasks || []), newTask] };
      }
      return job;
    });
    setJobs(updatedJobs);
    const updatedSelectedJob = updatedJobs.find(j => j.id === jobId);
    if (updatedSelectedJob) setSelectedJob(updatedSelectedJob);
    addToast('Task added.', 'success');
  };

  const handleUpdateTask = (jobId: number, updatedTask: Task) => {
    const updatedJobs = jobs.map(job => {
      if (job.id === jobId) {
        return { ...job, tasks: (job.tasks || []).map(t => t.id === updatedTask.id ? updatedTask : t) };
      }
      return job;
    });
    setJobs(updatedJobs);
    const updatedSelectedJob = updatedJobs.find(j => j.id === jobId);
    if (updatedSelectedJob) setSelectedJob(updatedSelectedJob);
  };

  const handleDeleteTask = (jobId: number, taskId: number) => {
    const updatedJobs = jobs.map(job => {
      if (job.id === jobId) {
        return { ...job, tasks: (job.tasks || []).filter(t => t.id !== taskId) };
      }
      return job;
    });
    setJobs(updatedJobs);
    const updatedSelectedJob = updatedJobs.find(j => j.id === jobId);
    if (updatedSelectedJob) setSelectedJob(updatedSelectedJob);
    addToast('Task deleted.', 'info');
  };

  const handleAddSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier = { ...supplier, id: Date.now() };
    setSuppliers(prev => [newSupplier, ...prev]);
    addToast(`Supplier "${newSupplier.name}" added successfully.`, 'success');
  };

  const handleDeleteSupplier = (supplierId: number) => {
    setSuppliers(prev => prev.filter(s => s.id !== supplierId));
    addToast('Supplier deleted.', 'info');
  };

  const handleUpdateSupplier = (updatedSupplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    addToast(`Supplier "${updatedSupplier.name}" updated.`, 'success');
  };

  const handleUpdateProfile = (newProfileData: ProfileData) => {
    setProfileData(newProfileData);
    addToast('Profile updated successfully!', 'success');
  };

  const onDismissToast = (id: number) => {
      setToasts(toasts => toasts.filter(t => t.id !== id));
  }

  const handleProactiveMessageSent = () => {
      setProactiveMessage(null);
  }

  const handleViewRAMS = (job: Job) => {
    setSelectedJob(job);
    if (job.documents?.RAMS) {
      setDocument({ type: 'RAMS', content: job.documents.RAMS });
    } else {
      handleGenerateDocument(job, 'RAMS');
    }
  }

  const handleViewDocument = (job: Job, type: DocumentType, content: string) => {
      setSelectedJob(job);
      setDocument({ type, content });
  };

  if (!apiKey) {
    return <ApiKeyInput onSubmit={handleApiKeySubmit} />;
  }
  
  const renderView = () => {
      switch(currentView) {
          case 'jobs':
              return <JobsDashboard 
                        jobs={jobs} 
                        onSelectJob={(job) => { setSelectedJob(job); setCurrentView('job-detail'); }}
                        onUpdateJobStatus={handleUpdateJobStatus}
                        onNavigate={setCurrentView}
                     />;
          case 'job-detail':
              if (!selectedJob) return <div>Error: No job selected.</div>
              return <JobDetail 
                        job={selectedJob} 
                        onBack={() => setCurrentView('jobs')} 
                        onGenerateDocument={handleGenerateDocument}
                        isDocLoading={isDocLoading}
                        onUpdateDocument={handleUpdateDocument}
                        onAddTask={handleAddTask}
                        onUpdateTask={handleUpdateTask}
                        onDeleteTask={handleDeleteTask}
                     />;
          case 'jobs-map':
              return <JobsMapViewer 
                        jobs={jobs} 
                        onBack={() => setCurrentView('jobs')} 
                     />;
          case 'documents':
              return <DocumentsDashboard
                        jobs={jobs}
                        onViewDocument={handleViewDocument}
                     />;
          case 'suppliers':
              return <SuppliersDashboard
                        suppliers={suppliers}
                        onAddSupplier={handleAddSupplier}
                        onUpdateSupplier={handleUpdateSupplier}
                        onDeleteSupplier={handleDeleteSupplier}
                     />;
          case 'compliance':
              return <ComplianceDashboard
                        jobs={jobs}
                        onViewChecklist={setSelectedChecklist}
                        onViewRAMS={handleViewRAMS}
                     />;
          case 'profile':
              return <Profile 
                        apiKey={apiKey}
                        profileData={profileData}
                        onProfileUpdate={handleUpdateProfile}
                        onEditDataChange={setCurrentEditingProfileData}
                        addToast={addToast}
                    />;
          case 'estimator':
              return (
                <>
                  <WelcomeBanner />
                  <InputForm 
                    onEstimateRequest={handleEstimateRequest} 
                    isLoading={isLoading} 
                    projectNotes={projectNotes}
                    onProjectNotesChange={setProjectNotes}
                    uploadedFiles={uploadedFiles}
                    onFilesChange={setUploadedFiles}
                    addToast={addToast}
                  />
                  {isLoading && <LoadingSpinner />}
                  {estimateResult && !isLoading && <EstimateDisplay result={estimateResult} onSave={handleSaveJob} />}
                </>
              );
          case 'dashboard':
          default:
              return <Dashboard 
                        jobs={jobs}
                        suppliers={suppliers}
                        onResetApiKey={handleResetApiKey}
                        onNavigate={setCurrentView}
                    />
      }
  }

  return (
    <div className="text-white min-h-screen flex flex-col font-sans relative">
      <AiBackground /> {/* Integrate AiBackground */}
      <Header 
        apiKeyIsSet={!!apiKey} 
        currentView={currentView}
        onSetView={setCurrentView}
        logoUrl={profileData.logo}
      />
      <main className={`relative z-10 container mx-auto p-4 md:p-8 flex-grow transition-all duration-300 ${isChatOpen ? 'md:pr-[25rem]' : ''}`}>
        {renderView()}
      </main>
      <Footer />
      <ToastContainer toasts={toasts} onDismiss={onDismissToast} />
      {document && selectedJob && (
          <DocumentViewer 
            document={document} 
            job={selectedJob}
            onClose={() => setDocument(null)}
            onSend={handleUpdateJobStatus}
            onUpdateDocument={handleUpdateDocument}
          />
      )}
       {selectedChecklist && (
        <ChecklistModal 
          checklist={selectedChecklist}
          onClose={() => setSelectedChecklist(null)}
        />
      )}
      {apiKey && (
        <>
            {isChatOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/50 md:bg-transparent"
                    onClick={() => setIsChatOpen(false)}
                    aria-hidden="true"
                ></div>
            )}
            <ChatWidget 
                proactiveMessage={proactiveMessage}
                onProactiveMessageSent={handleProactiveMessageSent}
                isOpen={isChatOpen}
                onToggle={setIsChatOpen}
                {...liveChat}
            />
        </>
      )}
    </div>
  );
};

export default App;
