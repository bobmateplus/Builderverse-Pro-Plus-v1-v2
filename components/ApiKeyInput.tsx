import React from 'react';
import Header from './Header';
import Footer from './Footer';

interface ApiKeyInputProps {
  onSubmit: (apiKey: string) => void;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ onSubmit }) => {

  // Fix: This component is now a fallback for when process.env.API_KEY is not set.
  // The primary method of API key provision is via environment variables.
  // The UI for manual input is retained for local development or specific deployment scenarios.
  const [apiKey, setApiKey] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSubmit(apiKey.trim());
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen flex flex-col font-sans">
        <Header apiKeyIsSet={false} />
        <main className="container mx-auto p-4 md:p-8 flex-grow flex items-center justify-center">
            <div className="w-full max-w-md">
                <div className="bg-slate-800 p-8 rounded-lg shadow-xl space-y-6 animate-fade-in-up">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white">Gemini API Key Required</h2>
                        <p className="text-slate-400 mt-2">
                            This application requires a Google Gemini API key to function. Please set the <code className="bg-slate-700 text-teal-400 px-1 py-0.5 rounded-md text-xs">API_KEY</code> environment variable.
                        </p>
                         <p className="text-slate-400 mt-2 text-sm">
                            For local development, you can enter a key below.
                        </p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="api-key" className="sr-only">
                                API Key (for local development)
                            </label>
                            <input
                                id="api-key"
                                type="password"
                                className="w-full bg-slate-700 text-white rounded-md border-slate-600 focus:ring-teal-500 focus:border-teal-500 transition"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Enter your API key here (if not set in env)"
                            />
                        </div>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-teal-400 hover:text-teal-300 hover:underline block text-center">
                            Get your API key from Google AI Studio
                        </a>
                        <button
                            type="submit"
                            disabled={!apiKey.trim()}
                            className="w-full bg-teal-600 text-white font-bold py-2 px-6 rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
                        >
                            Save and Continue
                        </button>
                    </form>
                </div>
            </div>
        </main>
        <Footer />
    </div>
  );
};

export default ApiKeyInput;