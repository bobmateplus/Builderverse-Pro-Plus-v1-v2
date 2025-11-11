
import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ProfileData, Post, Testimonial, PaymentOption, ImageAspectRatio, VideoAspectRatio, UploadedFile } from '../types';
import { BuilderAvatarIcon, ArrowUpTrayIcon, PencilIcon, SparklesIcon, PhotoIcon, GeoIcon, MagnifyingGlassIcon, TrashIcon, VideoCameraIcon, PlusIcon, ChevronDownIcon, ChevronUpIcon, ShareIcon, LinkedInIcon, FacebookIcon, TwitterIcon, InstagramIcon, BankIcon, CreditCardIcon, CurrencyPoundIcon, ShieldCheckIcon, NoSymbolIcon, MinimizeIcon, XIcon } from './icons';
import { 
    generateImageWithAi, // Uses new service function
    generatePromotionalPost, 
    generateCaptionForImage, 
    generateAboutUs, 
    analyzeImageWithAi, // Uses new service function
    generateVideoWithAi // Uses new service function
} from '../services/geminiService';
import { useGeolocation, getPostcodeFromCoords, getCoordsFromAddress } from '../hooks/useGeolocation';
import { parseApiError } from '../utils/errorHandler';

interface ProfileProps {
    apiKey: string;
    profileData: ProfileData;
    onProfileUpdate: (data: ProfileData) => void;
    onEditDataChange: (data: ProfileData) => void;
    addToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

const LOGO_STYLES = ['Minimalist', 'Geometric', 'Abstract', 'Emblem', 'Wordmark', 'Modern', 'Flat Design', '3D Rendered', 'Hand-drawn', 'Vintage', 'Luxury', 'Tech', 'Industrial', 'Mascot', 'Typographic'];
const BANNER_STYLES = ['Modern', 'Photorealistic', 'Illustrative', 'Abstract', 'Vibrant', 'Professional', 'Cinematic', 'Vaporwave', 'Sci-Fi', 'Fantasy', 'Gritty', 'Ethereal', 'High-Tech', 'Art Deco', 'Urban', 'Rural / Nature', 'Collage'];
const IMAGE_ASPECT_RATIOS: ImageAspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];
const VIDEO_ASPECT_RATIOS: VideoAspectRatio[] = ['16:9', '9:16'];

const Profile: React.FC<ProfileProps> = ({ apiKey, profileData, onProfileUpdate, onEditDataChange, addToast }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(profileData);
    const [isPostsExpanded, setIsPostsExpanded] = useState(false);
    const [isImageUnderstandingExpanded, setIsImageUnderstandingExpanded] = useState(false);

    const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
    const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
    const [isGeneratingAboutUs, setIsGeneratingAboutUs] = useState(false);
    
    // Pro Logo Generation State
    const [logoStyle, setLogoStyle] = useState('Minimalist');
    const [logoColors, setLogoColors] = useState('');
    const [logoUserPrompt, setLogoUserPrompt] = useState('');
    const [logoReferenceImage, setLogoReferenceImage] = useState<string | null>(null);

    // Pro Banner Generation State
    const [bannerStyle, setBannerStyle] = useState('Modern');
    const [bannerColors, setBannerColors] = useState('');
    const [bannerUserPrompt, setBannerUserPrompt] = useState('');
    const [bannerReferenceImage, setBannerReferenceImage] = useState<string | null>(null);


    const bannerFileInputRef = useRef<HTMLInputElement>(null);
    const logoFileInputRef = useRef<HTMLInputElement>(null);
    const postImageFileInputRef = useRef<HTMLInputElement>(null);
    const postVideoFileInputRef = useRef<HTMLInputElement>(null);
    const imageAnalysisFileInputRef = useRef<HTMLInputElement>(null);
    const logoReferenceInputRef = useRef<HTMLInputElement>(null);
    const bannerReferenceInputRef = useRef<HTMLInputElement>(null);


    const [isGeocoding, setIsGeocoding] = useState(false);
    const { data: geoData, loading: geoLoading, getLocation } = useGeolocation({
        onError: (err) => addToast(err.message, 'error')
    });
    
    // Post Management State
    const [isGeneratingTextPost, setIsGeneratingTextPost] = useState(false);
    const [isGeneratingImagePost, setIsGeneratingImagePost] = useState(false);
    const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
    const [newPostPrompt, setNewPostPrompt] = useState('');
    const [imageGenPrompt, setImageGenPrompt] = useState('');
    const [imagePostAspectRatio, setImagePostAspectRatio] = useState<ImageAspectRatio>('1:1');
    const [newPostCaption, setNewPostCaption] = useState('');
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostType, setNewPostType] = useState<'text' | 'image' | 'video' | null>(null);

    // New states for text post options
    const [postLength, setPostLength] = useState<'short' | 'medium' | 'long'>('medium');
    const [postTone, setPostTone] = useState<'professional' | 'friendly' | 'urgent'>('professional');

    // Testimonial Management State
    const [newTestimonialClient, setNewTestimonialClient] = useState('');
    const [newTestimonialQuote, setNewTestimonialQuote] = useState('');
    
    // AI Image Editing State
    const [isEditingLogoWithAI, setIsEditingLogoWithAI] = useState(false);
    const [logoEditPrompt, setLogoEditPrompt] = useState('');
    const [isGeneratingEditedLogo, setIsGeneratingEditedLogo] = useState(false);
    
    const [isEditingBannerWithAI, setIsEditingBannerWithAI] = useState(false);
    const [bannerEditPrompt, setBannerEditPrompt] = useState('');
    const [isGeneratingEditedBanner, setIsGeneratingEditedBanner] = useState(false);

    // Certification Management State
    const [newCertification, setNewCertification] = useState('');

    // Image Analysis State
    const [imageForAnalysis, setImageForAnalysis] = useState<UploadedFile | null>(null);
    const [imageAnalysisPrompt, setImageAnalysisPrompt] = useState('Describe this image.');
    const [imageAnalysisResult, setImageAnalysisResult] = useState<string | null>(null);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

    // Video Generation State
    const [videoGenPrompt, setVideoGenPrompt] = useState('');
    const [videoAspectRatio, setVideoAspectRatio] = useState<VideoAspectRatio>('16:9');
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    // Removed videoProgressMessage and abortControllerRef as polling is moved to backend
    const [hasVeoApiKeySelected, setHasVeoApiKeySelected] = useState<boolean | null>(null);


    const currentProfileForAI = isEditing ? editData : profileData;


    useEffect(() => {
        setEditData(profileData);
    }, [profileData]);
    
    useEffect(() => {
        if (isEditing) {
            onEditDataChange(editData);
        } else {
            onEditDataChange(profileData);
        }
    }, [editData, isEditing, onEditDataChange, profileData]);


    useEffect(() => {
        if (geoData) {
            const newCoords = { lat: geoData.latitude, lng: geoData.longitude };
            setEditData(prev => ({ ...prev, coords: newCoords }));
            getPostcodeFromCoords(geoData.latitude, geoData.longitude).then(postcode => {
                if (postcode) {
                    setEditData(prev => ({ ...prev, location: postcode }));
                }
            });
        }
    }, [geoData]);

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setHasVeoApiKeySelected(hasKey);
            } else {
                setHasVeoApiKeySelected(false);
            }
        };
        checkKey();
    }, []);

    const handleSave = () => {
        onProfileUpdate(editData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditData(profileData);
        setIsEditing(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner' | 'analysis' | 'logoReference' | 'bannerReference') => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                if (type === 'analysis') {
                    setImageForAnalysis({ name: file.name, type: file.type, size: file.size, base64: base64 });
                    setImageAnalysisResult(null);
                } else if (type === 'logoReference') {
                    setLogoReferenceImage(base64);
                } else if (type === 'bannerReference') {
                    setBannerReferenceImage(base64);
                } else {
                    setEditData(prev => ({ ...prev, [type]: base64, lastGeneratedImage: base64 }));
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGenerateLogo = async () => {
        if (!logoUserPrompt.trim() && !logoColors.trim() && logoStyle === 'Minimalist' && !logoReferenceImage) {
            addToast('Please provide a prompt, style, colors, or a reference image for the logo generation.', 'error');
            return;
        }
        setIsGeneratingLogo(true);
        try {
            const options = { style: logoStyle, colors: logoColors.trim() || undefined };
            const result = await generateImageWithAi(apiKey, logoUserPrompt, currentProfileForAI, 'logo', logoReferenceImage, '1:1', options);
            if (result) {
                const base64Image = result.startsWith('data:image') ? result : `data:image/png;base64,${result}`;
                setEditData(prev => ({ ...prev, logo: base64Image, lastGeneratedImage: base64Image }));
                addToast('Logo generated successfully!', 'success');
            } else {
                addToast('AI service returned an empty result for the logo.', 'error');
            }
        } catch (error) {
            addToast(parseApiError(error), 'error');
        } finally {
            setIsGeneratingLogo(false);
        }
    };
    
    const handleGenerateBanner = async () => {
        if (!bannerUserPrompt.trim() && !bannerColors.trim() && bannerStyle === 'Modern' && !bannerReferenceImage) {
            addToast('Please provide a prompt, style, colors, or a reference image for the banner generation.', 'error');
            return;
        }
        setIsGeneratingBanner(true);
        try {
            const options = { style: bannerStyle, colors: bannerColors.trim() || undefined };
            const result = await generateImageWithAi(apiKey, bannerUserPrompt, currentProfileForAI, 'banner', bannerReferenceImage, '16:9', options);
            if (result) {
                const base64Image = result.startsWith('data:image') ? result : `data:image/png;base64,${result}`;
                setEditData(prev => ({ ...prev, banner: base64Image, lastGeneratedImage: base64Image }));
                addToast('Banner generated successfully!', 'success');
            } else {
                addToast('AI service returned an empty result for the banner.', 'error');
            }
        } catch (error) {
            addToast(parseApiError(error), 'error');
        } finally {
            setIsGeneratingBanner(false);
        }
    };

    const handleGenerateAboutUs = async () => {
        setIsGeneratingAboutUs(true);
        try {
            const result = await generateAboutUs(apiKey, currentProfileForAI);
            setEditData(prev => ({...prev, aboutUs: result }));
            addToast('"About Us" content generated!', 'success');
        } catch (error) {
            addToast(parseApiError(error), 'error');
        } finally {
            setIsGeneratingAboutUs(false);
        }
    };
    
    // Fix: Updated to call `generateImageWithAi` directly for logo editing,
    // passing the current logo as the `referenceImageBase64`.
    const handleGenerateEditedLogo = async () => {
        if (!logoEditPrompt.trim() || !currentProfileForAI.logo) {
            addToast('Please provide a logo and an edit prompt.', 'error');
            return;
        }
        setIsGeneratingEditedLogo(true);
        try {
            const options = { style: logoStyle, colors: logoColors.trim() || undefined };
            // The `apiKey` parameter is handled by the Edge Function, so pass it.
            const result = await generateImageWithAi(apiKey, logoEditPrompt, currentProfileForAI, 'logo', currentProfileForAI.logo, '1:1', options);
            if (result) {
                const base64Image = result.startsWith('data:image') ? result : `data:image/png;base64,${result}`;
                setEditData(prev => ({ ...prev, logo: base64Image, lastGeneratedImage: base64Image }));
                addToast('Logo edited successfully!', 'success');
                setIsEditingLogoWithAI(false);
                setLogoEditPrompt('');
            } else {
                addToast('AI service returned an empty result for the logo edit.', 'error');
            }
        } catch (error) {
            addToast(parseApiError(error), 'error');
        } finally {
            setIsGeneratingEditedLogo(false);
        }
    };

    // Fix: Updated to call `generateImageWithAi` directly for banner editing,
    // passing the current banner as the `referenceImageBase64`.
    const handleGenerateEditedBanner = async () => {
        if (!bannerEditPrompt.trim() || !currentProfileForAI.banner) {
            addToast('Please provide a banner and an edit prompt.', 'error');
            return;
        }
        setIsGeneratingEditedBanner(true);
        try {
            const options = { style: bannerStyle, colors: bannerColors.trim() || undefined };
            // The `apiKey` parameter is handled by the Edge Function, so pass it.
            const result = await generateImageWithAi(apiKey, bannerEditPrompt, currentProfileForAI, 'banner', currentProfileForAI.banner, '16:9', options);
            if (result) {
                const base64Image = result.startsWith('data:image') ? result : `data:image/png;base64,${result}`;
                setEditData(prev => ({ ...prev, banner: base64Image, lastGeneratedImage: base64Image }));
                addToast('Banner edited successfully!', 'success');
                setIsEditingBannerWithAI(false);
                setBannerEditPrompt('');
            } else {
                addToast('AI service returned an empty result for the banner edit.', 'error');
            }
        } catch (error) {
            addToast(parseApiError(error), 'error');
        } finally {
            setIsGeneratingEditedBanner(false);
        }
    };
    
    const handleGenerateTextPost = async () => {
        if (!newPostPrompt.trim()) return;
        setIsGeneratingTextPost(true);
        try {
            setNewPostType('text');
            const result = await generatePromotionalPost(apiKey, currentProfileForAI, newPostPrompt, postLength, postTone);
            setNewPostContent(result);
            setImageGenPrompt('');
            setGeneratedVideoUrl(null);
            addToast('Text post generated!', 'success');
        } catch (error) {
            addToast(parseApiError(error), 'error');
        } finally {
            setIsGeneratingTextPost(false);
        }
    };
    
    const handleGeneratePostImage = async () => {
        if (!imageGenPrompt.trim()) return;
        setIsGeneratingImagePost(true);
        try {
            const result = await generateImageWithAi(apiKey, imageGenPrompt, currentProfileForAI, 'post', null, imagePostAspectRatio);
            if (result) {
                const base64Image = result.startsWith('data:image') ? result : `data:image/png;base64,${result}`;
                setNewPostContent(base64Image);
                setNewPostType('image');
                setNewPostPrompt('');
                setGeneratedVideoUrl(null);
                setEditData(prev => ({ ...prev, lastGeneratedImage: base64Image }));
                addToast('Image for post generated!', 'success');
            } else {
                addToast('AI service returned an empty image.', 'error');
            }
        } catch (error) {
            addToast(parseApiError(error), 'error');
        } finally {
            setIsGeneratingImagePost(false);
        }
    };

    const handleGenerateCaption = async () => {
        if (newPostType !== 'image' || !newPostContent) return;
        setIsGeneratingCaption(true);
        try {
            const result = await generateCaptionForImage(apiKey, currentProfileForAI, newPostContent);
            setNewPostCaption(result);
            addToast('Caption generated from image!', 'success');
        } catch (error) {
            addToast(parseApiError(error), 'error');
        } finally {
            setIsGeneratingCaption(false);
        }
    };

    const handleAnalyzeImage = async () => {
        if (!imageForAnalysis?.base64 || !imageAnalysisPrompt.trim()) {
            addToast('Please upload an image and provide a prompt for analysis.', 'error');
            return;
        }
        setIsAnalyzingImage(true);
        setImageAnalysisResult(null);
        try {
            // The apiKey parameter is handled by the Edge Function, so pass it.
            const result = await analyzeImageWithAi(apiKey, imageForAnalysis.base64, imageAnalysisPrompt);
            setImageAnalysisResult(result);
            addToast('Image analysis complete!', 'success');
        } catch (error) {
            addToast(parseApiError(error), 'error');
        } finally {
            setIsAnalyzingImage(false);
        }
    };

    const checkAndSelectVeoApiKey = useCallback(async () => {
        if (!window.aistudio || typeof window.aistudio.hasSelectedApiKey !== 'function') {
            addToast('AI Studio key selection tools not available.', 'error');
            setHasVeoApiKeySelected(false);
            return false;
        }

        try {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            if (!hasKey) {
                addToast('Veo video generation requires an API key selection. Opening selection dialog...', 'info');
                await window.aistudio.openSelectKey();
                setHasVeoApiKeySelected(true); 
                return true;
            }
            setHasVeoApiKeySelected(true);
            return true;
        } catch (error) {
            console.error("Error during Veo API key selection:", error);
            addToast('Failed to verify/select Veo API key. Please try again.', 'error');
            setHasVeoApiKeySelected(false);
            return false;
        }
    }, [addToast]);


    const handleGenerateVideoPost = async () => {
        if (!videoGenPrompt.trim()) {
            addToast('Please provide a prompt for video generation.', 'error');
            return;
        }

        const keyIsReady = await checkAndSelectVeoApiKey();
        if (!keyIsReady) {
            addToast('Veo API key not selected. Please select one to continue.', 'error');
            return;
        }
        
        setIsGeneratingVideo(true);
        setGeneratedVideoUrl(null);
        // Removed setVideoProgressMessage and abortControllerRef as polling is moved to backend

        try {
            // The apiKey parameter is handled by the Edge Function, so pass it.
            const videoUri = await generateVideoWithAi(apiKey, videoGenPrompt, videoAspectRatio); // Uses new `generateVideoWithAi`
            setNewPostContent(videoUri);
            setNewPostType('video');
            setNewPostPrompt('');
            setImageGenPrompt('');
            setNewPostCaption('');
            setGeneratedVideoUrl(videoUri);
            addToast('Video generated successfully! Preview below.', 'success');
        } catch (error: any) {
            // Removed specific cancellation handling
            const errorMessage = parseApiError(error);
            addToast(errorMessage, 'error');
            if (errorMessage.includes("Requested entity was not found.")) {
                addToast('Veo API key might be invalid or expired. Please re-select your API key.', 'error');
                setHasVeoApiKeySelected(false);
            }
        } finally {
            setIsGeneratingVideo(false);
            // Removed setVideoProgressMessage(null); abortControllerRef.current = null;
        }
    };

    // Removed handleCancelVideoGeneration as client-side polling is removed


    const handlePostFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target?.result as string;
                setNewPostContent(base64);
                setNewPostType(type);
                setNewPostPrompt('');
                setImageGenPrompt('');
                setGeneratedVideoUrl(null);
                setNewPostCaption('');
                setEditData(prev => ({ ...prev, lastGeneratedImage: base64 }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAddPost = () => {
        if (!newPostType || !newPostContent) {
            addToast("Please generate or upload content for the post.", 'error');
            return;
        }
        const newPost: Post = {
            id: Date.now(),
            type: newPostType,
            content: newPostContent,
            caption: newPostCaption,
            createdAt: new Date().toISOString(),
        };
        const updatedPosts = [...(profileData.posts || []), newPost];
        const updatedProfile = { 
            ...profileData, 
            posts: updatedPosts, 
            lastGeneratedImage: newPostType === 'image' ? newPostContent : profileData.lastGeneratedImage 
        };
        onProfileUpdate(updatedProfile);
        setEditData(updatedProfile);

        addToast('New post added to your profile!', 'success');

        setNewPostCaption('');
        setNewPostContent('');
        setNewPostPrompt('');
        setImageGenPrompt('');
        setNewPostType(null);
        setGeneratedVideoUrl(null);
    };

    const handleDeletePost = (postId: number) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            const updatedPosts = (profileData.posts || []).filter(p => p.id !== postId);
            const updatedProfile = { ...profileData, posts: updatedPosts };
            onProfileUpdate(updatedProfile);
            setEditData(updatedProfile);
            addToast('Post deleted.', 'info');
        }
    };

    const handleAddTestimonial = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTestimonialClient.trim() || !newTestimonialQuote.trim()) {
            addToast("Please fill in both client name and quote.", 'error');
            return;
        }
        const newTestimonial: Testimonial = {
            id: Date.now(),
            clientName: newTestimonialClient.trim(),
            quote: newTestimonialQuote.trim(),
        };
        setEditData(prev => ({
            ...prev,
            testimonials: [...(prev.testimonials || []), newTestimonial]
        }));
        setNewTestimonialClient('');
        setNewTestimonialQuote('');
    };

    const handleDeleteTestimonial = (testimonialId: number) => {
        setEditData(prev => ({
            ...prev,
            testimonials: (prev.testimonials || []).filter(t => t.id !== testimonialId)
        }));
    };
    
    const handleAddPaymentOption = () => {
        const newOption: PaymentOption = {
            id: Date.now(),
            method: '',
            details: '',
        };
        setEditData(prev => ({
            ...prev,
            paymentOptions: [...(prev.paymentOptions || []), newOption]
        }));
    };
    
    const handleUpdatePaymentOption = (id: number, field: 'method' | 'details', value: string) => {
        setEditData(prev => ({
            ...prev,
            paymentOptions: (prev.paymentOptions || []).map(opt => 
                opt.id === id ? { ...opt, [field]: value } : opt
            )
        }));
    };
    
    const handleDeletePaymentOption = (id: number) => {
        setEditData(prev => ({
            ...prev,
            paymentOptions: (prev.paymentOptions || []).filter(opt => opt.id !== id)
        }));
    };

    const handleAddCertification = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCertification.trim()) {
            setEditData(prev => ({
                ...prev,
                certifications: [...(prev.certifications || []), newCertification.trim()]
            }));
            setNewCertification('');
        }
    };

    const handleDeleteCertification = (certToDelete: string) => {
        setEditData(prev => ({
            ...prev,
            certifications: (prev.certifications || []).filter(c => c !== certToDelete)
        }));
    };


    const handleShare = () => {
        const companySlug = profileData.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const url = `https://builderverse.ai/profile/${companySlug || 'my-company'}`;
        navigator.clipboard.writeText(url).then(() => {
            addToast('Public profile link copied to clipboard!', 'success');
        }, (err) => {
            addToast('Failed to copy link.', 'error');
            console.error('Could not copy text: ', err);
        });
    };
    
    const getPaymentIcon = (method: string) => {
        const lowerMethod = method.toLowerCase();
        if (lowerMethod.includes('bank')) return <BankIcon className="h-6 w-6 text-slate-400" />;
        if (lowerMethod.includes('card') || lowerMethod.includes('stripe')) return <CreditCardIcon className="h-6 w-6 text-slate-400" />;
        return <CurrencyPoundIcon className="h-6 w-6 text-slate-400" />;
    };

    const renderSocialLinkInput = (IconComponent: React.ComponentType<React.SVGProps<SVGSVGElement>>, placeholder: string, value: string | undefined, onChange: (value: string) => void) => (
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <IconComponent className="h-5 w-5 text-slate-400" />
            </div>
            <input 
                type="url" 
                value={value || ''} 
                onChange={e => onChange(e.target.value)} 
                placeholder={placeholder} 
                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 pl-10 text-sm" 
            />
        </div>
    );
    
    const handleLocationSearch = async () => {
        if (!editData.location.trim()) {
            addToast('Please enter a location to search.', 'info');
            return;
        }
        setIsGeocoding(true);
        const result = await getCoordsFromAddress(editData.location);
        if (result) {
            setEditData(prev => ({ ...prev, coords: result }));
            addToast(`Location found on map.`, 'info');
        } else {
            setEditData(prev => ({ ...prev, coords: { lat: 0, lng: 0 } }));
            addToast(`Could not find coordinates for "${editData.location}".`, 'error');
        }
        setIsGeocoding(false);
    };

   
    return (
        <div className="animate-fade-in -m-4 p-4 md:-m-8 md:p-8 min-h-full relative overflow-hidden flex flex-col items-center">
             <input type="file" ref={bannerFileInputRef} onChange={(e) => handleFileChange(e, 'banner')} className="hidden" accept="image/*" />
             <input type="file" ref={logoFileInputRef} onChange={(e) => handleFileChange(e, 'logo')} className="hidden" accept="image/*" />
             <input type="file" ref={postImageFileInputRef} onChange={(e) => handlePostFileChange(e, 'image')} className="hidden" accept="image/*" />
             <input type="file" ref={postVideoFileInputRef} onChange={(e) => handlePostFileChange(e, 'video')} className="hidden" accept="video/*" />
             <input type="file" ref={imageAnalysisFileInputRef} onChange={(e) => handleFileChange(e, 'analysis')} className="hidden" accept="image/*" />
             <input type="file" ref={logoReferenceInputRef} onChange={(e) => handleFileChange(e, 'logoReference')} className="hidden" accept="image/*" />
             <input type="file" ref={bannerReferenceInputRef} onChange={(e) => handleFileChange(e, 'bannerReference')} className="hidden" accept="image/*" />


            <header className="text-center mb-8 md:mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white glow-text">Builderverse Profile</h2>
                <p className="text-slate-400 mt-2 text-sm md:text-base">Manage your company branding and contact information.</p>
            </header>

            <div className="w-full max-w-4xl">
                 <div className="profile-panel rounded-xl overflow-hidden text-center">
                    <div 
                        className="h-64 sm:h-80 bg-cover bg-center relative"
                        style={{ backgroundImage: (isEditing ? editData.banner : profileData.banner) ? `url(${(isEditing ? editData.banner : profileData.banner)})` : 'none' }}
                    >
                        {!(isEditing ? editData.banner : profileData.banner) && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
                                <NoSymbolIcon className="h-12 w-12 text-slate-600" />
                            </div>
                        )}
                        {isEditing && (
                            <div className="absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center gap-4 p-4">
                                <div className="flex flex-col gap-2 items-center">
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => bannerFileInputRef.current?.click()} className="text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5"><ArrowUpTrayIcon className="h-4 w-4"/> Upload</button>
                                        <button type="button" onClick={() => setIsEditingBannerWithAI(prev => !prev)} disabled={!editData.banner} className="text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"><SparklesIcon className="h-4 w-4"/> Edit with AI</button>
                                    </div>
                                    {isEditingBannerWithAI && (
                                        <div className="w-full max-w-sm p-2 bg-slate-900/50 rounded-md mt-2 animate-fade-in-up">
                                            <textarea 
                                                value={bannerEditPrompt}
                                                onChange={(e) => setBannerEditPrompt(e.target.value)}
                                                placeholder="e.g., 'Make the sky sunset orange'"
                                                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-xs"
                                                rows={2}
                                            />
                                            <button type="button" onClick={handleGenerateEditedBanner} disabled={isGeneratingEditedBanner} className="w-full mt-1 text-xs bg-teal-600/50 text-teal-200 font-bold py-1.5 px-3 rounded-md hover:bg-teal-600/70 disabled:opacity-50 flex items-center justify-center gap-2">
                                                 {isGeneratingEditedBanner ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : 'Generate Edit'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {isGeneratingBanner && (
                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-400"></div>
                            </div>
                        )}
                    </div>

                    <div className="p-6 relative">
                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-28 h-28 sm:w-36 sm:h-36 sm:-top-32 rounded-full border-4 border-slate-800 bg-slate-900">
                            {(isEditing ? editData.logo : profileData.logo) ? (
                                <img src={(isEditing ? editData.logo : profileData.logo)!} alt="Builder Logo" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <BuilderAvatarIcon className="w-full h-full text-teal-400 p-4" />
                            )}
                             {isEditing && (
                                <div className="absolute inset-0 bg-black/60 transition-opacity flex flex-col items-center justify-center rounded-full p-1 gap-1">
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => logoFileInputRef.current?.click()} className="text-xs bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1 px-2 rounded-full transition-colors flex items-center gap-1"><ArrowUpTrayIcon className="h-3 w-3"/><span className="hidden sm:inline">Upload</span></button>
                                        <button type="button" onClick={() => setIsEditingLogoWithAI(prev => !prev)} disabled={!editData.logo} className="text-xs bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1 px-2 rounded-full transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"><SparklesIcon className="h-3 w-3"/><span className="hidden sm:inline">Edit AI</span></button>
                                    </div>
                                    {isEditingLogoWithAI && (
                                        <div className="w-full max-w-sm p-1 bg-slate-900/50 rounded-md animate-fade-in-up">
                                            <input 
                                                type="text"
                                                value={logoEditPrompt}
                                                onChange={(e) => setLogoEditPrompt(e.target.value)}
                                                placeholder="e.g., 'Make it gold'"
                                                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-1 text-xs"
                                            />
                                            <button type="button" onClick={handleGenerateEditedLogo} disabled={isGeneratingEditedLogo} className="w-full mt-1 text-xs bg-teal-600/50 text-teal-200 font-bold py-1 px-2 rounded-md hover:bg-teal-600/70 disabled:opacity-50 flex items-center justify-center gap-1">
                                                 {isGeneratingEditedLogo ? <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white"></div> : 'Generate'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {isGeneratingLogo && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-400"></div>
                                </div>
                            )}
                        </div>

                        <div className="pt-20 sm:pt-28">
                            {!isEditing ? (
                                <>
                                    <div className="absolute top-4 right-4 flex items-center gap-1 sm:gap-2">
                                        <button type="button" onClick={handleShare} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-700/50" aria-label="Share Profile">
                                            <ShareIcon className="h-5 w-5" />
                                        </button>
                                        <button type="button" onClick={() => setIsEditing(true)} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-700/50" aria-label="Edit Profile">
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-2">{profileData.name}</h3>
                                    <p className="text-teal-400">{profileData.company}</p>
                                    {profileData.slogan && <p className="text-slate-300 mt-2 text-lg italic">"{profileData.slogan}"</p>}
                                    <div className="mt-4 text-left text-sm text-slate-300 border-t border-teal-500/20 pt-4 w-full max-w-md mx-auto space-y-2">
                                        {profileData.aboutUs && <p className="text-slate-300 mb-4 text-base text-center italic">"{profileData.aboutUs}"</p>}
                                        <div className="flex flex-col space-y-1">
                                            <div className="flex"><strong className="font-semibold text-slate-100 w-20 sm:w-24 flex-shrink-0">Specialty:</strong> <span className="truncate">{profileData.specialization}</span></div>
                                            <div className="flex"><strong className="font-semibold text-slate-100 w-20 sm:w-24 flex-shrink-0">Location:</strong> <span className="truncate">{profileData.location}</span></div>
                                            <div className="flex"><strong className="font-semibold text-slate-100 w-20 sm:w-24 flex-shrink-0">Email:</strong> <span className="truncate">{profileData.email || 'Not set'}</span></div>
                                            <div className="flex"><strong className="font-semibold text-slate-100 w-20 sm:w-24 flex-shrink-0">Phone:</strong> <span className="truncate">{profileData.phone || 'Not set'}</span></div>
                                            <div className="flex"><strong className="font-semibold text-slate-100 w-20 sm:w-24 flex-shrink-0">Website:</strong> {profileData.website ? <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline truncate">{profileData.website}</a> : 'Not set'}</div>
                                        </div>
                                    </div>
                                    {profileData.serviceArea && (
                                        <div className="mt-4 pt-4 border-t border-teal-500/20 w-full max-w-md mx-auto">
                                            <h4 className="font-semibold text-slate-100 mb-2 text-center text-sm">Service Area</h4>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {profileData.serviceArea.split(',').map(area => area.trim()).filter(Boolean).map((area, index) => (
                                                    <span key={index} className="bg-slate-700 text-teal-300 text-xs font-medium px-2.5 py-1 rounded-full">
                                                        {area}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {profileData.certifications && profileData.certifications.length > 0 && (
                                        <div className="mt-4 pt-4 border-t border-teal-500/20 w-full max-w-md mx-auto">
                                            <h4 className="font-semibold text-slate-100 mb-2 text-center text-sm">Certifications</h4>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {profileData.certifications.map((cert, index) => (
                                                    <span key={index} className="bg-slate-700 text-teal-300 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5">
                                                        <ShieldCheckIcon className="h-4 w-4" />
                                                        {cert}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                     {(profileData.paymentOptions && profileData.paymentOptions.length > 0) && (
                                        <div className="mt-4 pt-4 border-t border-teal-500/20 w-full max-w-md mx-auto">
                                            <h4 className="font-semibold text-slate-100 mb-3 text-center text-sm">Accepted Payments</h4>
                                            <div className="space-y-3 text-left">
                                                {profileData.paymentOptions.map(opt => (
                                                    <div key={opt.id} className="flex items-start gap-3">
                                                        <div className="flex-shrink-0 mt-0.5">{getPaymentIcon(opt.method)}</div>
                                                        <div>
                                                            <p className="font-semibold text-slate-200">{opt.method}</p>
                                                            <p className="text-xs text-slate-400 whitespace-pre-wrap">{opt.details}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-4 pt-4 border-t border-teal-500/20 flex justify-center items-center gap-4">
                                        {profileData.socialLinks?.linkedin && <a href={profileData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-teal-400 transition-colors"><LinkedInIcon className="h-6 w-6"/></a>}
                                        {profileData.socialLinks?.facebook && <a href={profileData.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-teal-400 transition-colors"><FacebookIcon className="h-6 w-6"/></a>}
                                        {profileData.socialLinks?.twitter && <a href={profileData.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-teal-400 transition-colors"><TwitterIcon className="h-6 w-6"/></a>}
                                        {profileData.socialLinks?.instagram && <a href={profileData.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-teal-400 transition-colors"><InstagramIcon className="h-6 w-6"/></a>}
                                    </div>
                                </>
                            ) : (
                                <div className="w-full max-w-lg mx-auto space-y-4 text-left">
                                    <h3 className="text-xl font-bold text-white mb-2 text-center">Edit Profile</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Builder Name</label>
                                        <input type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Company</label>
                                        <input type="text" value={editData.company} onChange={e => setEditData({...editData, company: e.target.value})} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Specialization</label>
                                        <input type="text" value={editData.specialization} onChange={e => setEditData({...editData, specialization: e.target.value})} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Company Slogan</label>
                                        <input type="text" value={editData.slogan || ''} onChange={e => setEditData({...editData, slogan: e.target.value})} placeholder="e.g., Building Tomorrow, Today." className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">About Us</label>
                                        <textarea value={editData.aboutUs} onChange={e => setEditData({...editData, aboutUs: e.target.value})} rows={4} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"></textarea>
                                        <button type="button" onClick={handleGenerateAboutUs} disabled={isGeneratingAboutUs} className="w-full mt-2 text-sm bg-indigo-600/50 text-indigo-200 font-bold py-2 px-4 rounded-md hover:bg-indigo-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                                            {isGeneratingAboutUs ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><SparklesIcon className="h-5 w-5"/> Generate with AI</>}
                                        </button>
                                    </div>

                                    <div className="border-t border-slate-600 pt-4 mt-4">
                                        <h4 className="font-semibold text-teal-400 mb-3">AI Branding Tools</h4>
                                        <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                            <label className="block text-sm font-medium text-slate-300">Generate Banner (16:9)</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-300 mb-1">Style</label>
                                                    <select value={bannerStyle} onChange={e => setBannerStyle(e.target.value)} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm">
                                                        {BANNER_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-300 mb-1">Colors</label>
                                                    <input type="text" value={bannerColors} onChange={e => setBannerColors(e.target.value)} placeholder="e.g. vibrant blue, gold" className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Reference Image (optional)</label>
                                                {bannerReferenceImage ? (
                                                    <div className="relative w-full h-32 mb-2 rounded-md overflow-hidden border border-slate-600">
                                                        <img src={bannerReferenceImage} alt="Banner Reference" className="w-full h-full object-cover" />
                                                        <button 
                                                            onClick={() => setBannerReferenceImage(null)} 
                                                            className="absolute top-1 right-1 bg-red-600/70 hover:bg-red-700/70 text-white p-1 rounded-full text-xs"
                                                            title="Remove reference image"
                                                        >
                                                            <XIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => bannerReferenceInputRef.current?.click()} className="w-full text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5 mb-2">
                                                        <ArrowUpTrayIcon className="h-4 w-4"/> Upload Reference Image
                                                    </button>
                                                )}
                                            </div>
                                            <textarea 
                                                value={bannerUserPrompt} 
                                                onChange={e => setBannerUserPrompt(e.target.value)} 
                                                rows={3} 
                                                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" 
                                                placeholder="AI will use your Company, Specialization & Slogan. Add more details here (e.g., 'a vibrant cityscape background')..." 
                                            />
                                            <button type="button" onClick={handleGenerateBanner} disabled={isGeneratingBanner} className="w-full bg-teal-600/50 text-teal-200 font-bold py-2 px-4 rounded-md hover:bg-teal-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                                                {isGeneratingBanner ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><SparklesIcon className="h-5 w-5"/> Generate Banner</>}
                                            </button>
                                        </div>
                                        <div className="space-y-3 mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                            <label className="block text-sm font-medium text-slate-300">Generate Logo (1:1)</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-300 mb-1">Style</label>
                                                    <select value={logoStyle} onChange={e => setLogoStyle(e.target.value)} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm">
                                                        {LOGO_STYLES.map(style => <option key={style} value={style}>{style}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-300 mb-1">Colors</label>
                                                    <input type="text" value={logoColors} onChange={e => setLogoColors(e.target.value)} placeholder="e.g. deep blue, silver" className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <label className="block text-sm font-medium text-slate-300 mb-1">Reference Image (optional)</label>
                                                {logoReferenceImage ? (
                                                    <div className="relative w-full h-32 mb-2 rounded-md overflow-hidden border border-slate-600">
                                                        <img src={logoReferenceImage} alt="Logo Reference" className="w-full h-full object-contain" />
                                                        <button 
                                                            onClick={() => setLogoReferenceImage(null)} 
                                                            className="absolute top-1 right-1 bg-red-600/70 hover:bg-red-700/70 text-white p-1 rounded-full text-xs"
                                                            title="Remove reference image"
                                                        >
                                                            <XIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => logoReferenceInputRef.current?.click()} className="w-full text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5 mb-2">
                                                        <ArrowUpTrayIcon className="h-4 w-4"/> Upload Reference Image
                                                    </button>
                                                )}
                                            </div>
                                            <textarea 
                                                value={logoUserPrompt} 
                                                onChange={e => setLogoUserPrompt(e.target.value)} 
                                                rows={3} 
                                                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" 
                                                placeholder="AI will use your Company, Specialization & Slogan. Add more details here (e.g., 'a strong, angular icon')..." 
                                            />
                                            <button type="button" onClick={handleGenerateLogo} disabled={isGeneratingLogo} className="w-full bg-teal-600/50 text-teal-200 font-bold py-2 px-4 rounded-md hover:bg-teal-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                                                {isGeneratingLogo ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><SparklesIcon className="h-5 w-5"/>}
                                                Generate Logo
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Location</label>
                                        <div className="flex">
                                            <input
                                                type="text"
                                                value={editData.location}
                                                onChange={e => setEditData({...editData, location: e.target.value})}
                                                placeholder="e.g., Manchester, UK"
                                                className="w-full bg-slate-700 text-white rounded-l-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"
                                            />
                                            <button type="button" onClick={handleLocationSearch} disabled={isGeocoding || !editData.location.trim()} className="p-2 bg-slate-600 hover:bg-slate-500 text-slate-300 disabled:opacity-50 flex items-center justify-center">
                                                {isGeocoding ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <MagnifyingGlassIcon className="h-5 w-5"/>}
                                            </button>
                                            <button type="button" onClick={getLocation} disabled={geoLoading} className="p-2 bg-slate-600 hover:bg-slate-500 rounded-r-md text-slate-300 disabled:opacity-50 flex items-center justify-center">
                                                {geoLoading ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div> : <GeoIcon className="h-5 w-5"/>}
                                            </button>
                                        </div>
                                    </div>
                                    {editData.coords.lat !== 0 && editData.coords.lng !== 0 && (
                                        <div className="aspect-video bg-slate-700 rounded-lg overflow-hidden border-2 border-slate-600 mt-2">
                                            <iframe
                                            className="w-full h-full"
                                            title="Profile Location Map"
                                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${editData.coords.lng - 0.01},${editData.coords.lat - 0.01},${editData.coords.lng + 0.01},${editData.coords.lat + 0.01}&layer=mapnik&marker=${editData.coords.lat},${editData.coords.lng}`}
                                            style={{ border: 0 }}
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                            ></iframe>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Service Area (comma-separated)</label>
                                        <input type="text" value={editData.serviceArea || ''} onChange={e => setEditData({...editData, serviceArea: e.target.value})} placeholder="e.g., Greater London, Kent, Essex" className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                                        <input type="email" value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                                        <input type="tel" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">Website</label>
                                        <input type="url" value={editData.website} onChange={e => setEditData({...editData, website: e.target.value})} placeholder="https://www.yourcompany.com" className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                    </div>

                                    <div className="border-t border-slate-600 pt-4 mt-4">
                                        <h4 className="font-semibold text-teal-400 mb-3">Certifications</h4>
                                        <div className="space-y-2 mb-3">
                                            {(editData.certifications || []).map((cert, index) => (
                                                <div key={index} className="flex items-center justify-between bg-slate-700 p-2 rounded-md">
                                                    <span className="text-sm text-slate-300">{cert}</span>
                                                    <button type="button" onClick={() => handleDeleteCertification(cert)} className="text-slate-400 hover:text-red-400 p-1"><TrashIcon className="h-4 w-4"/></button>
                                                </div>
                                            ))}
                                            {(editData.certifications || []).length === 0 && <p className="text-sm text-slate-500">No certifications added yet.</p>}
                                        </div>
                                        <form onSubmit={handleAddCertification} className="flex gap-2">
                                            <input type="text" value={newCertification} onChange={e => setNewCertification(e.target.value)} placeholder="Add new certification..." className="flex-grow bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                            <button type="submit" className="bg-teal-600 text-white p-2 rounded-md hover:bg-teal-700 transition-colors"><PlusIcon className="h-5 w-5"/></button>
                                        </form>
                                    </div>

                                    <div className="border-t border-slate-600 pt-4 mt-4">
                                        <h4 className="font-semibold text-teal-400 mb-3">Social Media Links</h4>
                                        <div className="space-y-3">
                                            {renderSocialLinkInput(LinkedInIcon, 'LinkedIn URL', editData.socialLinks?.linkedin, (value) => setEditData(prev => ({ ...prev, socialLinks: { ...(prev.socialLinks || {}), linkedin: value } })))}
                                            {renderSocialLinkInput(FacebookIcon, 'Facebook URL', editData.socialLinks?.facebook, (value) => setEditData(prev => ({ ...prev, socialLinks: { ...(prev.socialLinks || {}), facebook: value } })))}
                                            {renderSocialLinkInput(TwitterIcon, 'Twitter URL', editData.socialLinks?.twitter, (value) => setEditData(prev => ({ ...prev, socialLinks: { ...(prev.socialLinks || {}), twitter: value } })))}
                                            {renderSocialLinkInput(InstagramIcon, 'Instagram URL', editData.socialLinks?.instagram, (value) => setEditData(prev => ({ ...prev, socialLinks: { ...(prev.socialLinks || {}), instagram: value } })))}
                                        </div>
                                    </div>
                                    
                                    <div className="border-t border-slate-600 pt-4 mt-4">
                                        <h4 className="font-semibold text-teal-400 mb-3">Accepted Payment Options</h4>
                                        <p className="text-sm text-slate-400 mb-3">These details will appear on generated invoices.</p>
                                        <div className="space-y-4">
                                            {(editData.paymentOptions || []).map(opt => (
                                                <div key={opt.id} className="bg-slate-700 p-3 rounded-md border border-slate-600">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <input type="text" value={opt.method} onChange={e => handleUpdatePaymentOption(opt.id, 'method', e.target.value)} placeholder="e.g., Bank Transfer, Stripe, Cheque" className="flex-grow bg-transparent text-white font-medium border-b border-slate-500 focus:border-teal-500 outline-none pb-1" />
                                                        <button type="button" onClick={() => handleDeletePaymentOption(opt.id)} className="text-slate-400 hover:text-red-400 p-1 ml-2"><TrashIcon className="h-4 w-4"/></button>
                                                    </div>
                                                    <textarea value={opt.details} onChange={e => handleUpdatePaymentOption(opt.id, 'details', e.target.value)} rows={2} placeholder="e.g., Account: 12345678, Sort Code: 12-34-56" className="w-full bg-transparent text-slate-300 text-sm border-none focus:ring-0 focus:border-none outline-none resize-y"></textarea>
                                                </div>
                                            ))}
                                            {(editData.paymentOptions || []).length === 0 && <p className="text-sm text-slate-500">No payment options added yet.</p>}
                                            <button type="button" onClick={handleAddPaymentOption} className="w-full bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"><PlusIcon className="h-5 w-5"/> Add Payment Option</button>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-600 pt-4 mt-4">
                                        <h4 className="font-semibold text-teal-400 mb-3">Testimonials</h4>
                                        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-2">
                                            {(editData.testimonials || []).map(testimonial => (
                                                <div key={testimonial.id} className="flex items-start justify-between bg-slate-700 p-2 rounded-md">
                                                    <div>
                                                        <p className="text-sm text-slate-300 italic">"{testimonial.quote}"</p>
                                                        <p className="text-xs text-slate-400 mt-1">&mdash; {testimonial.clientName}</p>
                                                    </div>
                                                    <button type="button" onClick={() => handleDeleteTestimonial(testimonial.id)} className="text-slate-400 hover:text-red-400 p-1 flex-shrink-0 ml-2"><TrashIcon className="h-4 w-4"/></button>
                                                </div>
                                            ))}
                                            {(editData.testimonials || []).length === 0 && <p className="text-sm text-slate-500">No testimonials added yet.</p>}
                                        </div>
                                        <form onSubmit={handleAddTestimonial} className="space-y-2">
                                            <input type="text" value={newTestimonialClient} onChange={e => setNewTestimonialClient(e.target.value)} placeholder="Client Name" className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" />
                                            <textarea value={newTestimonialQuote} onChange={e => setNewTestimonialQuote(e.target.value)} rows={3} placeholder="Client's quote..." className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"></textarea>
                                            <button type="submit" className="w-full bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"><PlusIcon className="h-5 w-5"/> Add Testimonial</button>
                                        </form>
                                    </div>
                                    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-600">
                                        <button type="button" onClick={handleCancel} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md hover:bg-slate-500 transition-colors">Cancel</button>
                                        <button type="button" onClick={handleSave} className="bg-teal-600 text-white font-bold py-2 px-4 rounded-md hover:bg-teal-700 transition-colors">Save Profile</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-4xl mt-8 profile-panel rounded-xl p-6 text-left">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-teal-400">Image Understanding (Gemini Flash)</h4>
                        <button type="button" onClick={() => setIsImageUnderstandingExpanded(prev => !prev)} className="text-slate-400 hover:text-white p-1 rounded-md">
                            {isImageUnderstandingExpanded ? <ChevronUpIcon className="h-5 w-5"/> : <ChevronDownIcon className="h-5 w-5"/>}
                        </button>
                    </div>
                    {isImageUnderstandingExpanded && (
                        <div className="space-y-4 pt-4 border-t border-slate-700/50">
                            <input type="file" ref={imageAnalysisFileInputRef} onChange={(e) => handleFileChange(e, 'analysis')} className="hidden" accept="image/*" />
                            <button type="button" onClick={() => imageAnalysisFileInputRef.current?.click()} className="w-full text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2">
                                <ArrowUpTrayIcon className="h-5 w-5"/> Upload Image for Analysis
                            </button>
                            {imageForAnalysis && (
                                <div className="p-3 bg-slate-900/50 rounded-md border border-slate-700 flex flex-col items-center space-y-3">
                                    <p className="text-sm text-slate-300">Image loaded: <span className="font-medium">{imageForAnalysis.name}</span></p>
                                    <img src={imageForAnalysis.base64} alt="Image for Analysis" className="max-h-60 rounded-md object-contain" />
                                    <textarea
                                        value={imageAnalysisPrompt}
                                        onChange={e => setImageAnalysisPrompt(e.target.value)}
                                        rows={3}
                                        className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"
                                        placeholder="e.g., 'Describe this image in detail.', 'What is happening here?', 'Identify any safety hazards.'"
                                    ></textarea>
                                    <button
                                        type="button"
                                        onClick={handleAnalyzeImage}
                                        disabled={isAnalyzingImage || !imageForAnalysis.base64 || !imageAnalysisPrompt.trim()}
                                        className="w-full text-sm bg-teal-600/50 text-teal-200 font-bold py-2 px-4 rounded-md hover:bg-teal-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isAnalyzingImage ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><SparklesIcon className="h-5 w-5"/> Analyze Image</>}
                                    </button>
                                    {imageAnalysisResult && (
                                        <div className="mt-4 p-3 bg-slate-700 rounded-md border border-slate-600 w-full text-left">
                                            <p className="font-semibold text-teal-300 mb-2">Analysis Result:</p>
                                            <p className="text-sm text-slate-200 whitespace-pre-wrap">{imageAnalysisResult}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>


                <div className="w-full max-w-4xl mt-8 profile-panel rounded-xl p-6 text-left">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-teal-400">Manage Posts</h4>
                        <button type="button" onClick={() => setIsPostsExpanded(prev => !prev)} className="text-slate-400 hover:text-white p-1 rounded-md">
                            {isPostsExpanded ? <ChevronUpIcon className="h-5 w-5"/> : <ChevronDownIcon className="h-5 w-5"/>}
                        </button>
                    </div>
                    {isPostsExpanded && (
                         <div className="space-y-4 pt-4 border-t border-slate-700/50">
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-3">
                                <h5 className="font-semibold text-white">Create New Post</h5>
                                {(newPostType || newPostContent) && (
                                    <div className="p-2 bg-slate-900/50 rounded-md flex flex-col items-center border border-slate-700">
                                        <p className="text-xs text-teal-400 mb-2">Post Preview:</p>
                                        {newPostType === 'image' && <img src={newPostContent} alt="New post preview" className="rounded max-h-48 w-auto object-contain" />}
                                        {newPostType === 'video' && <video src={newPostContent} controls className="rounded max-h-48 w-full object-contain" />}
                                        {newPostType === 'text' && <p className="text-sm text-slate-300 italic p-2 border border-dashed border-slate-600 rounded-md">"{newPostContent}"</p>}
                                         {(newPostType === 'image' || newPostType === 'video') && newPostContent && (
                                            <button 
                                                onClick={() => {setNewPostContent(''); setNewPostType(null); setGeneratedVideoUrl(null); setNewPostCaption('');}}
                                                className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                            >
                                                <MinimizeIcon className="h-4 w-4"/> Clear Preview
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => postImageFileInputRef.current?.click()} className="text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5"><PhotoIcon className="h-4 w-4"/> Upload Image</button>
                                    <button type="button" onClick={() => postVideoFileInputRef.current?.click()} className="text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5"><VideoCameraIcon className="h-4 w-4"/> Upload Video</button>
                                </div>
                                
                                <div className="relative py-2">
                                    <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-700/50"></div></div>
                                    <div className="relative flex justify-center"><span className="bg-slate-800/50 px-2 text-xs text-slate-400">or Generate with AI</span></div>
                                </div>

                                {/* Generate Image Post Section */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-300">Generate an Image Post (Imagen 4.0)</label>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div className="col-span-2">
                                            <label htmlFor="image-gen-prompt" className="block text-xs font-medium text-slate-300 mb-1">Image Description</label>
                                            <textarea id="image-gen-prompt" value={imageGenPrompt} onChange={e => setImageGenPrompt(e.target.value)} rows={2} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" placeholder="e.g., 'A modern kitchen renovation with a marble island, warm lighting'"></textarea>
                                        </div>
                                        <div>
                                            <label htmlFor="image-post-aspect-ratio" className="block text-xs font-medium text-slate-300 mb-1">Aspect Ratio</label>
                                            <select
                                                id="image-post-aspect-ratio"
                                                value={imagePostAspectRatio}
                                                onChange={e => setImagePostAspectRatio(e.target.value as ImageAspectRatio)}
                                                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"
                                            >
                                                {IMAGE_ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button type="button" onClick={handleGeneratePostImage} disabled={isGeneratingImagePost} className="w-full text-sm bg-teal-600/50 text-teal-200 font-bold py-2 px-4 rounded-md hover:bg-teal-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                                        {isGeneratingImagePost ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><SparklesIcon className="h-5 w-5"/> Generate Image</>}
                                    </button>
                                </div>

                                {/* Generate Video Post Section */}
                                <div className="space-y-2 pt-2 border-t border-slate-700/50">
                                    <label className="block text-sm font-medium text-slate-300">Generate a Video Post (Veo 3.1)</label>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div className="col-span-2">
                                            <label htmlFor="video-gen-prompt" className="block text-xs font-medium text-slate-300 mb-1">Video Description</label>
                                            <textarea id="video-gen-prompt" value={videoGenPrompt} onChange={e => setVideoGenPrompt(e.target.value)} rows={2} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" placeholder="e.g., 'A drone shot of a construction site from sunrise to sunset'"></textarea>
                                        </div>
                                        <div>
                                            <label htmlFor="video-aspect-ratio" className="block text-xs font-medium text-slate-300 mb-1">Aspect Ratio</label>
                                            <select
                                                id="video-aspect-ratio"
                                                value={videoAspectRatio}
                                                onChange={e => setVideoAspectRatio(e.target.value as VideoAspectRatio)}
                                                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"
                                            >
                                                {VIDEO_ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{ratio}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGenerateVideoPost} // Removed conditional logic for cancellation
                                        disabled={!videoGenPrompt.trim() || isGeneratingVideo} // Simplified disabled state
                                        className={`w-full text-sm font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 ${
                                            isGeneratingVideo ? 'bg-purple-700/50 text-purple-200' : 'bg-purple-600/50 text-purple-200 hover:bg-purple-600/70'
                                        }`}
                                    >
                                        {isGeneratingVideo ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                                Generating Video...
                                            </>
                                        ) : (
                                            <><VideoCameraIcon className="h-5 w-5"/> Generate Video</>
                                        )}
                                    </button>
                                    {isGeneratingVideo && <p className="text-sm text-slate-400 mt-2">Video generation started. This may take several minutes...</p>} {/* Simplified progress message */}
                                    {hasVeoApiKeySelected === false && !isGeneratingVideo && (
                                        <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-md text-sm text-red-300">
                                            <p className="mb-2">Veo video generation requires an API key selection:</p>
                                            <button
                                                onClick={checkAndSelectVeoApiKey}
                                                className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-md text-xs transition-colors"
                                            >
                                                Select API Key for Veo
                                            </button>
                                            <p className="mt-2 text-xs">
                                                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline text-red-200 hover:text-white">Billing info for Veo</a>
                                            </p>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Generate Text Post Section */}
                                <div className="space-y-2 pt-2 border-t border-slate-700/50">
                                    <label className="block text-sm font-medium text-slate-300">Generate a Text Post</label>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div>
                                            <label htmlFor="post-length" className="block text-xs font-medium text-slate-300 mb-1">Length</label>
                                            <select
                                                id="post-length"
                                                value={postLength}
                                                onChange={e => setPostLength(e.target.value as 'short' | 'medium' | 'long')}
                                                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"
                                            >
                                                <option value="short">Short</option>
                                                <option value="medium">Medium</option>
                                                <option value="long">Long</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="post-tone" className="block text-xs font-medium text-slate-300 mb-1">Tone</label>
                                            <select
                                                id="post-tone"
                                                value={postTone}
                                                onChange={e => setPostTone(e.target.value as 'professional' | 'friendly' | 'urgent')}
                                                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm"
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="friendly">Friendly</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                        </div>
                                    </div>
                                    <textarea value={newPostPrompt} onChange={e => setNewPostPrompt(e.target.value)} rows={2} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" placeholder="e.g., 'A post about our expertise in loft conversions'"></textarea>
                                    <button type="button" onClick={handleGenerateTextPost} disabled={isGeneratingTextPost} className="w-full text-sm bg-teal-600/50 text-teal-200 font-bold py-2 px-4 rounded-md hover:bg-teal-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                                        {isGeneratingTextPost ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><SparklesIcon className="h-5 w-5"/> Generate Text</>}
                                    </button>
                                </div>

                                <div className="pt-2 border-t border-slate-700/50 space-y-2">
                                        <label className="block text-sm font-medium text-slate-300">Caption (optional):</label>
                                        <textarea value={newPostCaption} onChange={e => setNewPostCaption(e.target.value)} rows={2} className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition p-2 text-sm" placeholder="Add a caption..."></textarea>
                                        {newPostType === 'image' && newPostContent && (
                                        <button type="button" onClick={handleGenerateCaption} disabled={isGeneratingCaption} className="w-full text-sm bg-indigo-600/50 text-indigo-200 font-bold py-2 px-4 rounded-md hover:bg-indigo-600/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                                            {isGeneratingCaption ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : <><SparklesIcon className="h-5 w-5"/> Generate Caption from Image</>}
                                        </button>
                                        )}
                                </div>
                                <button type="button" onClick={handleAddPost} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2" disabled={!newPostType || !newPostContent}>
                                    <PlusIcon className="h-5 w-5"/> Add Post
                                </button>
                            </div>

                            {(profileData.posts && profileData.posts.length > 0) && (
                                <div className="mt-6">
                                    <h5 className="font-semibold text-white mb-2">Current Posts</h5>
                                    <div className="space-y-2">
                                        {profileData.posts.slice().reverse().map(post => (
                                            <div key={post.id} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-md border border-slate-700">
                                                <div className="flex items-center gap-3">
                                                    {post.type === 'image' && <img src={post.content} alt={post.caption} className="w-10 h-10 rounded object-cover"/>}
                                                    {post.type === 'video' && <VideoCameraIcon className="w-10 h-10 rounded text-slate-500"/>}
                                                    {post.type === 'text' && <SparklesIcon className="w-10 h-10 rounded text-teal-400 p-2"/>}
                                                    <p className="text-sm text-slate-300 truncate">{post.caption || `A ${post.type} post`}</p>
                                                </div>
                                                <button type="button" onClick={() => handleDeletePost(post.id)} className="p-2 text-slate-400 hover:text-red-400"><TrashIcon className="h-4 w-4"/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
