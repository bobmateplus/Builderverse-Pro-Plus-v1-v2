import React from 'react';
import type { Job, Supplier, View } from '../types';
import { ChartBarIcon, Cog6ToothIcon, ArrowUpTrayIcon, NoSymbolIcon, GeoIcon } from './icons'; // Added GeoIcon

interface DashboardProps {
    jobs: Job[];
    suppliers: Supplier[];
    onResetApiKey: () => void;
    onNavigate: (view: View) => void; // Added for Jobs Map navigation
}

const extractTotalFromMarkdown = (markdown: string): number => {
    const match = markdown.match(/Total.*£\s?([\d,]+\.\d{2})/i);
    if (match && match[1]) {
        return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
};

const StatCard: React.FC<{ label: string; value: string | number; }> = ({ label, value }) => (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center transition-all hover:border-teal-500/50">
        <div>
            <p className="text-3xl font-bold text-white glow-text">{value}</p>
            <p className="text-sm text-slate-400 uppercase tracking-wider mt-1">{label}</p>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ jobs, suppliers, onResetApiKey, onNavigate }) => {
    
    const jobsCompleted = jobs.filter(j => j.status === 'Complete').length;
    const supplierCount = suppliers.length;
    const totalValueEstimated = jobs.reduce((sum, job) => sum + extractTotalFromMarkdown(job.estimate.markdown), 0);
    const formattedTotalValue = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(totalValueEstimated);
    
    const handleExport = () => alert("Feature coming soon: Export all your jobs and suppliers data as a CSV file.");
    const handleClearData = () => {
        if (window.confirm("Are you sure you want to clear all jobs and suppliers? This action cannot be undone.")) {
            alert("Feature coming soon: This will permanently delete all your local data.");
        }
    };

    return (
        <div className="animate-fade-in">
             <header className="mb-8">
                <h2 className="text-3xl font-bold text-white">Dashboard</h2>
                <p className="text-slate-400 mt-1">Your command center for stats and settings.</p>
            </header>

            <div className="space-y-8">
                {/* Stats Section */}
                <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <h4 className="text-lg font-semibold text-slate-300 mb-4">At a Glance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard label="Jobs Done" value={jobsCompleted} />
                        <StatCard label="Value Estimated" value={formattedTotalValue} />
                        <StatCard label="Compliance Rating" value="98%" />
                        <StatCard label="Suppliers" value={supplierCount} />
                    </div>
                </div>

                {/* Quick Actions Section (for map and other quick navigation) */}
                <div className="animate-fade-in-up pt-6" style={{ animationDelay: '200ms' }}>
                    <h4 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <ChartBarIcon className="h-5 w-5"/>
                        Quick Actions
                    </h4>
                    <div className="max-w-md space-y-4 bg-slate-800/70 p-6 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-300">Explore Job Locations</p>
                            <button 
                                onClick={() => onNavigate('jobs-map')} 
                                className="text-sm bg-teal-600 hover:bg-teal-700 text-white font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5"
                            >
                                <GeoIcon className="h-4 w-4"/> View Map
                            </button>
                        </div>
                    </div>
                </div>

                {/* Settings Section */}
                <div className="animate-fade-in-up pt-6" style={{ animationDelay: '200ms' }}>
                    <h4 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <Cog6ToothIcon className="h-5 w-5"/>
                        App Settings
                    </h4>
                    <div className="max-w-md space-y-4 bg-slate-800/70 p-6 rounded-lg border border-slate-700">
                        <div className="flex items-center justify-between">
                            <p className="text-slate-300">Theme</p>
                            <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-800 border border-slate-600">
                                <button className="px-3 py-1 text-sm rounded-md bg-slate-700 text-white">Dark</button>
                                <button className="px-3 py-1 text-sm rounded-md text-slate-400 hover:text-white">Blueprint</button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-slate-300">Reset API Key</p>
                            <button onClick={onResetApiKey} className="text-sm bg-slate-700 hover:bg-red-600/50 text-white font-semibold py-1.5 px-3 rounded-md transition-colors">Reset Key</button>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-slate-300">Export Data</p>
                            <button onClick={handleExport} className="text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5"><ArrowUpTrayIcon className="h-4 w-4"/> Export</button>
                        </div>
                        <div className="flex items-center justify-between">
                            <p className="text-slate-300">Clear All Local Data</p>
                            <button onClick={handleClearData} className="text-sm bg-red-900/70 hover:bg-red-800/80 text-red-300 font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5"><NoSymbolIcon className="h-4 w-4"/> Clear Data</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;