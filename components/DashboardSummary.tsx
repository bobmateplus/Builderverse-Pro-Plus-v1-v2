import React from 'react';
import type { Job } from '../types';
import { BriefcaseIcon, ChartBarIcon, CurrencyPoundIcon } from './icons';

interface DashboardSummaryProps {
    jobs: Job[];
}

const extractTotalFromMarkdown = (markdown: string): number => {
    // Regex to find a line with "Total" and a GBP amount like £1,234.56 or £1234.56
    const match = markdown.match(/Total.*£\s?([\d,]+\.\d{2})/i);
    if (match && match[1]) {
        // Remove commas and parse as a float
        return parseFloat(match[1].replace(/,/g, ''));
    }
    return 0;
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 p-5 rounded-lg flex items-center space-x-4">
        <div className="flex items-center space-x-4 flex-1">
            <div className="bg-slate-700 p-3 rounded-full">
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

const DashboardSummary: React.FC<DashboardSummaryProps> = ({ jobs }) => {
    const totalJobs = jobs.length;
    const activeJobs = jobs.filter(j => j.status === 'In Progress').length;
    
    const totalQuotedValue = jobs
        .filter(j => j.status === 'Quoted' || j.status === 'In Progress' || j.status === 'Complete')
        .reduce((sum, job) => sum + extractTotalFromMarkdown(job.estimate.markdown), 0);
        
    const formattedQuotedValue = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
    }).format(totalQuotedValue);

    return (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            <StatCard 
                title="Total Jobs" 
                value={totalJobs} 
                icon={<BriefcaseIcon className="h-6 w-6 text-teal-400" />} 
            />
            <StatCard 
                title="Active Jobs" 
                value={activeJobs} 
                icon={<ChartBarIcon className="h-6 w-6 text-amber-400" />} 
            />
            <StatCard 
                title="Value of Work" 
                value={formattedQuotedValue} 
                icon={<CurrencyPoundIcon className="h-6 w-6 text-green-400" />} 
            />
        </div>
    );
};

export default DashboardSummary;