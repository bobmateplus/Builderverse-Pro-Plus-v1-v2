

import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { ChatBubbleIcon, MicrophoneIcon, XIcon, PaperAirplaneIcon, ChevronUpIcon, ChevronDownIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from './icons';

interface ChatWidgetProps {
    proactiveMessage: string | null;
    onProactiveMessageSent: () => void;
    isOpen: boolean;
    onToggle: (isOpen: boolean) => void;
    // Props from useLiveChat hook
    isSessionActive: boolean;
    isConnecting: boolean;
    isMuted: boolean; // Mic input mute
    isAiOutputMuted: boolean; // AI voice output mute
    isModelSpeaking: boolean;
    isReplying: boolean;
    messages: ChatMessage[];
    error: string | null;
    outputVolume: number; // New: AI output volume
    startSession: () => void;
    stopSession: () => void;
    toggleMute: () => void; // Toggle mic input mute
    toggleAiOutputMute: () => void; // Toggle AI output mute
    setOutputVolume: (volume: number) => void; // New: Set AI output volume
    sendSystemMessage: (message: string) => void;
    sendTextMessage: (message: string) => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = (props) => {
    const { 
        proactiveMessage, 
        onProactiveMessageSent, 
        isOpen, 
        onToggle,
        isSessionActive,
        isConnecting,
        isReplying,
        messages,
        error,
        startSession,
        stopSession,
        sendSystemMessage,
        sendTextMessage,
        isMuted, // Mic input mute state
        isAiOutputMuted, // AI output mute state
        toggleMute, // Toggle mic input
        toggleAiOutputMute, // Toggle AI output
        outputVolume, // New: AI output volume
        setOutputVolume, // New: Set AI output volume
        isModelSpeaking
    } = props;

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (proactiveMessage) {
            onToggle(true);
            setIsCollapsed(false);
            sendSystemMessage(proactiveMessage);
            onProactiveMessageSent();
        }
    }, [proactiveMessage, sendSystemMessage, onProactiveMessageSent, onToggle]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages]);

    const handleSessionControl = () => {
        if (isSessionActive || isConnecting) {
            stopSession();
        } else {
            startSession();
        }
    };
    
    const handleTextSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            sendTextMessage(inputText);
            setInputText('');
        }
    };

    const getMicButtonClass = () => {
        if (isConnecting) return 'bg-amber-500 animate-pulse';
        if (isSessionActive) return 'bg-red-600 hover:bg-red-700';
        return 'bg-teal-600 hover:bg-teal-700';
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => onToggle(true)}
                className="fixed bottom-5 right-5 bg-teal-600 text-white p-4 rounded-full shadow-lg hover:bg-teal-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-500 z-50"
                aria-label="Open Chat"
            >
                <ChatBubbleIcon className="h-8 w-8" />
                {isSessionActive && <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-green-400 ring-2 ring-white animate-pulse"></span>}
            </button>
        );
    }

    return (
        <div className={`fixed bottom-0 right-0 w-full max-w-sm bg-slate-800 border-l border-slate-700 shadow-2xl flex flex-col transition-all duration-300 md:bottom-auto md:top-0 md:h-full ${isCollapsed ? 'h-16 overflow-hidden' : 'h-[calc(100vh-theme(space.16))] md:h-full'} animate-slide-in-right z-50`}>
            <header className="flex items-center justify-between p-3 border-b border-slate-700 flex-shrink-0">
                <h3 className="font-bold text-white">Bob Mate AI Assistant</h3>
                <div className="flex items-center space-x-2">
                    {/* New button for AI output mute */}
                    <button 
                        onClick={toggleAiOutputMute} 
                        className="text-slate-400 p-2 rounded-md hover:bg-slate-700/50"
                        title={isAiOutputMuted || outputVolume === 0 ? 'Unmute AI voice' : 'Mute AI voice'}
                        aria-label={isAiOutputMuted || outputVolume === 0 ? 'Unmute AI voice' : 'Mute AI voice'}
                    >
                        {isAiOutputMuted || outputVolume === 0 ? <SpeakerXMarkIcon className="h-6 w-6" /> : <SpeakerWaveIcon className="h-6 w-6" fill="currentColor" />}
                    </button>
                    {/* Volume Slider */}
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={outputVolume}
                        onChange={(e) => setOutputVolume(parseFloat(e.target.value))}
                        className="w-20 accent-teal-500"
                        aria-label="AI Voice Volume"
                        title="AI Voice Volume"
                        disabled={isAiOutputMuted}
                    />
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="text-slate-400 hover:text-white">
                        {isCollapsed ? <ChevronUpIcon className="h-6 w-6" /> : <ChevronDownIcon className="h-6 w-6" />}
                    </button>
                    {/* The primary close button for the chat widget */}
                    <button onClick={() => onToggle(false)} className="text-slate-400 hover:text-white">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>
            </header>

            {!isCollapsed && (
                <>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <ChatMessageBubble key={msg.id || index} message={msg} />
                        ))}
                        {isConnecting && <div className="text-center text-xs text-slate-400 italic py-1">Connecting...</div>}
                        {(isModelSpeaking || isReplying) && <ChatMessageBubble message={{role: 'model', text: '...', status: 'typing', id: 'typing-indicator'}} />}
                        {error && <p className="text-red-400 text-sm px-2">Error: {error}</p>}
                        <div ref={messagesEndRef} />
                    </div>

                    <footer className="p-3 border-t border-slate-700 flex flex-col gap-2">
                        {isSessionActive && (
                            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                                <span className="flex items-center gap-1">
                                    <MicrophoneIcon className={`h-4 w-4 ${isMuted ? 'text-red-400' : 'text-teal-400'}`} />
                                    {isMuted ? 'Mic Muted' : 'Listening...'}
                                </span>
                                <button
                                    onClick={toggleMute}
                                    className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
                                    title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                                >
                                    {isMuted ? 'Unmute' : 'Mute'}
                                </button>
                            </div>
                        )}
                         <form onSubmit={handleTextSend} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder={isSessionActive ? "Voice session is active" : "Type a message..."}
                                className="flex-1 bg-slate-700 text-white rounded-lg border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition px-3 py-2 text-sm"
                                disabled={isSessionActive || isConnecting || isReplying}
                            />
                            <button
                                type="submit"
                                disabled={!inputText.trim() || isSessionActive || isConnecting || isReplying}
                                className="bg-teal-600 text-white p-2.5 rounded-lg hover:bg-teal-700 disabled:bg-slate-600 disabled:opacity-70 transition-colors"
                                aria-label="Send Message"
                            >
                                <PaperAirplaneIcon className="h-5 w-5" />
                            </button>
                             <div className="h-6 w-px bg-slate-600"></div>
                             <button 
                                type="button"
                                onClick={handleSessionControl}
                                disabled={isConnecting || isReplying}
                                className={`p-3 rounded-full text-white transition-colors disabled:opacity-50 ${getMicButtonClass()}`}
                                aria-label={isSessionActive ? 'End Voice Chat' : 'Start Voice Chat'}
                            >
                                <MicrophoneIcon className="h-5 w-5"/>
                            </button>
                        </form>
                    </footer>
                </>
            )}
        </div>
    );
};

const ChatMessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    if (isSystem) {
        return (
            <div className="text-center text-xs text-slate-400 italic py-1 px-4 border-t border-b border-slate-700/50">
                {message.text}
            </div>
        )
    }

    return (
        <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 ${
                isUser 
                    ? 'bg-teal-600 text-white rounded-br-none' 
                    : 'bg-slate-700 text-slate-200 rounded-bl-none'
                }`}
            >
              {message.status === 'typing' ? (
                 <div className="flex items-center space-x-1 py-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></span>
                </div>
              ) : (
                <p className="text-sm">{message.text}</p>
              )}
            </div>
        </div>
    );
};

export default ChatWidget;