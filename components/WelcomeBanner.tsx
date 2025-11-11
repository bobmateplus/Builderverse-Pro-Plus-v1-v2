import React, { useState } from 'react';
// Fix: Correct import path for icons
import { XIcon } from './icons';

const WelcomeBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) {
        return null;
    }

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-8 flex justify-between items-center animate-fade-in">
            <div>
                <h2 className="font-bold text-lg text-white">Welcome to Estimator Pro Plus</h2>
                <p className="text-slate-300">Enter your project details below to get a UK-accurate cost estimate powered by Bob Mate AI. For questions, use the chat widget.</p>
            </div>
            <button
                onClick={() => setIsVisible(false)}
                className="text-slate-400 hover:text-white p-2 rounded-full"
                aria-label="Dismiss welcome banner"
            >
                <XIcon className="h-5 w-5" />
            </button>
        </div>
    );
};

export default WelcomeBanner;
