

import React from 'react';

// Global flag to indicate if Gemini Live API is actively generating audio
// This prevents browser TTS from speaking at the same time.
export const isGeminiLiveActiveRef = React.createRef<boolean>();
isGeminiLiveActiveRef.current = false; // Initialize to false

/**
 * Uses the browser's SpeechSynthesis API to speak a given text.
 * @param text The string to be spoken.
 * @param volume Optional: The volume for the speech, a value between 0.0 (silent) and 1.0 (loudest). Defaults to 1.0.
 */
export const speak = (text: string, volume: number = 1.0): void => {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Text-to-speech is not supported in this environment.');
    return;
  }

  // If Gemini Live API is active, do not use browser TTS
  if (isGeminiLiveActiveRef.current) {
    return;
  }

  // Cancel any ongoing browser speech before starting a new one
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB'; // Set to British English
  utterance.volume = Math.max(0, Math.min(1, volume)); // Ensure volume is between 0 and 1
  
  // Optional: find a specific UK voice if available
  const voices = window.speechSynthesis.getVoices();
  const ukVoice = voices.find(voice => voice.lang === 'en-GB');
  if (ukVoice) {
    utterance.voice = ukVoice;
  }

  window.speechSynthesis.speak(utterance);
};

/**
 * Cancels any ongoing browser speech synthesis.
 */
export const cancelSpeech = (): void => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};


// It's good practice to load voices beforehand, as it can be asynchronous
if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
    };
}