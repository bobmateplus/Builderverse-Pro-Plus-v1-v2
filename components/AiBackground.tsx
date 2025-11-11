
import React, { useEffect, useState } from 'react';
import { generateImage } from '../services/geminiService'; // Import the new service function
import type { ImageGenRequest, ImageGenResponse } from '../types';

export default function AiBackground({ prompt = 'A minimal abstract geometric background, professional, clean lines, construction theme, blueprint colors' }: { prompt?: string }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const payload: ImageGenRequest = { prompt, width: 1920, height: 1080, aspectRatio: '16:9' };
    setLoading(true);

    generateImage(payload) // Call the refactored service function
      .then((res: ImageGenResponse) => {
        if (!mounted) return;
        if (res.images?.[0]?.url) setImageUrl(res.images[0].url);
        if (res.images?.[0]?.base64) setImageUrl(`data:image/png;base64,${res.images[0].base64}`); // Assume PNG for base64
      })
      .catch((err) => {
        console.error('AI background generation failed', err);
        // Fallback to a default if generation fails
        setImageUrl('https://via.placeholder.com/1920x1080/0f172a/6b7280?text=AI+Background+Failed');
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [prompt]);

  return (
    <div aria-hidden className="ai-bg fixed inset-0 -z-10 pointer-events-none">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-slate-400">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
          <span className="ml-4">Generating background...</span>
        </div>
      )}
      {!loading && imageUrl && (
        <img src={imageUrl} alt="AI generated background" className="w-full h-full object-cover opacity-30 transition-opacity duration-1000" />
      )}
      {/* Fallback solid background if no image or error */}
      {!loading && !imageUrl && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 opacity-50 h-full w-full"></div>
      )}
    </div>
  );
}
